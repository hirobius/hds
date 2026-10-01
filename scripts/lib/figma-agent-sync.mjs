/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — builds figma/push/use-figma/delta.js, the zero-click
 * agent sync (hds#418, hds#397 C3): one use_figma call that applies a merged
 * token change to staging and writes the Sync receipt, with no step by Adrian.
 *
 * `pnpm figma:push --delta` plans offline against the committed
 * figma/snapshot.json and bakes into delta.js:
 *   - PLAN: the change as a model slice (the variables, collections and
 *     styles the plan touches, as patches over what staging holds, plus every
 *     variable they alias, as anchors), the pin (the committed checksum,
 *     takenAt and file), both file keys, and the checksum of the plan the
 *     slice gives against the snapshot;
 *   - PLAN_CHECKSUM over PLAN, and the runtime delta.js reaches
 *     (figma-agent-runtime.mjs hdsAgentRun: hdsApply, hdsPlan, hdsReadState,
 *     hdsFontPreflight, the snapshot delta codec and the C2 receipt writer),
 *     checked by hdsVerifyRuntime like every use_figma carrier.
 * Its first statement refuses any file but staging. See hdsAgentRun for what
 * it checks and does in Figma.
 *
 * It refuses to build, naming the route: a plan that moves variables between
 * collections, has conflicts, or makes a delta.js over 45,000 characters
 * (use_figma takes 50,000), or that writes a text or effect style
 * description holding " ' < > & (use_figma's read of one is not measured),
 * goes to Sync; --prune, and any variable, mode or
 * style staging holds that the model does not (an extra: a token deleted
 * from hirobius.tokens.json), go to the promote plugin, because delta.js
 * and Sync never delete. delta.js checks the extras again in staging.
 */

import {
  hdsChecksum,
  hdsDescribePlan,
  hdsPlan,
  hdsPlanWarnings,
  hdsSummarize,
  hdsSummaryLine,
} from './figma-runtime.mjs';
import { parse } from 'acorn';
import {
  agentRuntimeSource,
  buildPushPayload,
  deltaRuntimeSource,
  reachableRuntime,
  runtimeSource,
  syncConfigFromLinks,
  syncRuntimeSource,
} from './figma-scripts.mjs';
import {
  hdsAgentHeld,
  hdsAgentSlice,
  hdsAgentStyleText,
  hdsAgentVariable,
} from './figma-agent-runtime.mjs';

/** The most characters delta.js may have: use_figma takes 50,000, and an agent retypes it. */
export const DELTA_MAX_CHARS = 45000;
/** Receipt pages (C2): delta.js returns the receipt inline when it fits one page. */
export const DELTA_PAGE_CHARS = 15000;
const RECEIPT_MAX_PAGES = 64;
/** Where a deletion goes instead: delta.js and Sync never delete. */
const ROUTE_TO_PROMOTE =
  ' A deliberate deletion or prune uses the promote plugin (pnpm figma:push --prune), from Figma desktop (figma/README.md "Promote plugin and use_figma scripts"). No delta.js was written.';
/** Why --delta never builds with --prune. */
export const DELTA_PRUNE_REFUSAL = `delta.js refused: it never deletes, so --delta refuses --prune.${ROUTE_TO_PROMOTE}`;
const ROUTE_TO_SYNC =
  ' Route it to Sync: ask Adrian to run Sync in staging (Plugins > Development > HDS tokens sync > Sync), then collect its receipt (figma/README.md "Agent: collect a sync"). No delta.js was written.';

const canonical = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const changed = (item) => item.action !== 'unchanged' || item.stampKey;
const refuse = (why) => {
  throw new Error(`delta.js refused: ${why}`);
};

/** A script's syntax tree without source positions: equal trees run the same code. */
const syntaxOf = (code) =>
  JSON.stringify(parse(code, { ecmaVersion: 2020, sourceType: 'script' }), (key, value) =>
    key === 'start' || key === 'end' ? undefined : value,
  );

/**
 * The runtime delta.js reaches, without indentation (it is a fifth of the
 * text, and use_figma takes 50,000 characters), plus the hdsVerifyRuntime
 * statement over exactly that text. Throws if dropping the indentation
 * changed what the code means (a template literal spanning lines).
 */
function compactRuntime() {
  const source = [
    runtimeSource(),
    deltaRuntimeSource(),
    syncRuntimeSource(),
    agentRuntimeSource(),
  ].join('\n\n');
  const functions = reachableRuntime(['hdsAgentRun'], source);
  const texts = functions.map((fn) => fn.text.replace(/\r/g, '').replace(/^[ \t]+/gm, ''));
  if (syntaxOf(texts.join('\n')) !== syntaxOf(functions.map((fn) => fn.text).join('\n'))) {
    throw new Error(
      'delta.js: dropping the runtime indentation changed its syntax tree (a template literal spans lines). Keep that text on one line.',
    );
  }
  return [
    texts.join('\n'),
    `hdsVerifyRuntime([${functions.map((fn) => fn.name).join(', ')}], '${hdsChecksum(texts.join('\n'))}');`,
  ].join('\n');
}

/** The part of a plan a push writes: what the slice's plan must reproduce exactly. */
function writesOf(plan) {
  return {
    collections: plan.collections.filter(changed),
    variables: plan.variables.filter(changed),
    textStyles: plan.textStyles.filter(changed),
    effectStyles: plan.effectStyles.filter(changed),
    removals: plan.removals,
    conflicts: plan.conflicts,
  };
}

/** The fields of `record` whose value differs from `from`'s. */
function patchOf(from, record) {
  const patch = {};
  Object.keys(record).forEach((key) => {
    if (key !== 'variables' && !same(from[key], record[key])) patch[key] = record[key];
  });
  return patch;
}

/** The TOKEN_MIGRATION.md renames matching follows from the given stored paths. */
function usedRenames(paths, renames) {
  const used = {};
  for (const path of paths) {
    let current = path;
    for (let hop = 0; current && hop < 16; hop++) {
      const old = Object.keys(renames)
        .filter((key) => current === key || current.startsWith(`${key}.`))
        .sort((a, b) => b.length - a.length)[0];
      if (!old) break;
      used[old] = renames[old];
      current = renames[old] + current.slice(old.length);
    }
  }
  return used;
}

/**
 * The slice of `push` (the push model) that `plan` (its plan against
 * `snapshot`) touches, as hdsAgentSlice reads it: changed records as patches
 * over the snapshot's, new ones whole, and every variable they alias.
 */
function sliceOf(push, snapshot, plan) {
  const stateById = new Map();
  snapshot.collections.forEach((c) => {
    stateById.set(c.id, c);
    c.variables.forEach((v) => stateById.set(v.id, v));
  });
  const textStyles = plan.textStyles.filter(changed).map((s) => s.set);
  const effectStyles = plan.effectStyles.filter(changed).map((s) => s.set);
  const want = new Set(plan.variables.filter(changed).map((v) => v.path));
  textStyles.forEach((s) => Object.values(s.boundVariables).forEach((path) => want.add(path)));
  const recordOf = new Map(push.collections.flatMap((c) => c.variables.map((v) => [v.path, v])));
  for (const path of want) {
    const record = recordOf.get(path);
    if (!record) continue;
    Object.values(record.valuesByMode).forEach(
      (entry) => 'alias' in entry && want.add(entry.alias),
    );
  }
  const collectionWrites = new Set(plan.collections.filter(changed).map((c) => c.key));
  const planned = new Map(plan.collections.map((c) => [c.key, c]));
  const kept = push.collections.filter(
    (c) => collectionWrites.has(c.key) || c.variables.some((v) => want.has(v.path)),
  );
  const pathOf = new Map();
  kept.forEach((c) =>
    c.variables.forEach(
      (v) => want.has(v.path) && plan.index[v.path] && pathOf.set(plan.index[v.path], v.path),
    ),
  );
  const slice = kept.map((c) => {
    const id = planned.get(c.key).id || null;
    const sc = id && stateById.get(id);
    const from = sc
      ? {
          key: c.key,
          name: sc.name,
          modes: sc.modes,
          hiddenFromPublishing: sc.hiddenFromPublishing,
        }
      : { key: c.key };
    const variables = c.variables
      .filter((v) => want.has(v.path))
      .map((v) => {
        const vid = plan.index[v.path] || null;
        const start = vid ? hdsAgentVariable(stateById.get(vid), v.path, pathOf) : { path: v.path };
        return [v.path, vid, patchOf(start, v)];
      });
    return [c.key, id, patchOf(from, c), variables];
  });
  const storedPaths = [...pathOf.keys()]
    .map((id) => stateById.get(id).path)
    .concat(
      plan.textStyles
        .filter(changed)
        .map((s) => s.id && snapshot.textStyles.find((x) => x.id === s.id).path),
      plan.effectStyles
        .filter(changed)
        .map((s) => s.id && snapshot.effectStyles.find((x) => x.id === s.id).path),
    )
    .filter(Boolean);
  return { slice, textStyles, effectStyles, kept, storedPaths };
}

/**
 * delta.js for the change from the committed snapshot to `model`, or a
 * refusal (an Error whose message names the cause and the route to Sync).
 *
 * @param {object} model  The Figma model.
 * @param {{ renames?: object, snapshotFile: {checksum: string, snapshot: object}|null, links: object, commit: string, prune?: boolean, pageChars?: number }} options
 * @returns {{ text: string|null, chars: number, line: string, changes: string[], warnings: string[], base: string, modelHash: string, commit: string, staging: string, nothing?: string }}
 */
export function buildUseFigmaDeltaScript(
  model,
  { renames = {}, snapshotFile, links, commit, prune = false, pageChars = DELTA_PAGE_CHARS },
) {
  if (prune) throw new Error(DELTA_PRUNE_REFUSAL);
  const sync = syncConfigFromLinks(links);
  if (!snapshotFile) {
    refuse(`there is no committed figma/snapshot.json to pin staging to.${ROUTE_TO_SYNC}`);
  }
  if (typeof commit !== 'string' || !/^[0-9a-f]{7,40}$/.test(commit)) {
    throw new Error(
      `delta.js needs the commit it is built from (7 to 40 hex digits), got ${JSON.stringify(commit)}.`,
    );
  }
  const { payload } = buildPushPayload(model, { renames });
  const push = payload.model;
  const snapshot = snapshotFile.snapshot;
  const options = { prune: false, scope: null, renames };
  const plan = hdsPlan(push, snapshot, options);
  const summary = hdsSummarize(plan);
  const report = {
    line: hdsSummaryLine(summary),
    changes: hdsDescribePlan(plan),
    warnings: hdsPlanWarnings(plan),
    base: snapshotFile.checksum,
    modelHash: payload.modelHash,
    commit,
    staging: sync.stagingFileKey,
  };
  if (plan.moves.length) {
    refuse(
      `the plan moves ${plan.moves.length} variable(s) between collections (${plan.moves.map((m) => `${m.collection}: ${m.name} -> ${m.to}`).join('; ')}), which leaves the old variable for a person to rebind.${ROUTE_TO_SYNC}`,
    );
  }
  if (plan.conflicts.length) {
    refuse(
      `the plan has ${plan.conflicts.length} conflict(s) a person must fix in Figma first: ${plan.conflicts.join(' | ')}${ROUTE_TO_SYNC}`,
    );
  }
  // Without prune a plan keeps what the model no longer has, as an extra that
  // plain check:figma-drift then reports: only a deliberate prune deletes it.
  const { extras } = plan;
  const extra = [
    ...extras.variables.map((v) => `variable ${v.path || `${v.collection}: ${v.name}`}`),
    ...extras.modes.map((m) => `mode ${m.collection}: ${m.mode}`),
    ...extras.textStyles.map((s) => `text style ${s.path}`),
    ...extras.effectStyles.map((s) => `effect style ${s.path}`),
  ];
  if (extra.length) {
    refuse(
      `staging holds ${extra.length} item(s) the model does not have (${extra.join('; ')}), and delta.js never deletes.${ROUTE_TO_PROMOTE}`,
    );
  }
  const styled = hdsAgentStyleText(plan);
  if (styled.length) {
    refuse(
      `the plan writes a style description holding one of " ' < > & (${styled.join(', ')}), and use_figma's read of a style description is not measured yet (a variable's reads back HTML-escaped), so delta.js could not check its own write.${ROUTE_TO_SYNC}`,
    );
  }
  const writes = writesOf(plan);
  const pushed = snapshot.lastPush && snapshot.lastPush.modelHash === payload.modelHash;
  if (
    pushed &&
    !writes.collections.length &&
    !writes.variables.length &&
    !writes.textStyles.length &&
    !writes.effectStyles.length
  ) {
    return {
      ...report,
      text: null,
      chars: 0,
      nothing: `staging already holds model ${payload.modelHash} (figma/snapshot.json ${snapshotFile.checksum}): nothing to sync, so no delta.js was written.`,
    };
  }

  const { slice, textStyles, effectStyles, kept, storedPaths } = sliceOf(push, snapshot, plan);
  const data = canonical({
    files: { staging: sync.stagingFileKey, library: sync.libraryFileKey },
    base: { checksum: snapshotFile.checksum, takenAt: snapshot.takenAt, file: snapshot.file },
    modelHash: payload.modelHash,
    commit,
    line: report.line,
    slice,
    textStyles,
    effectStyles,
    options: { prune: false, scope: null, renames: usedRenames(storedPaths, renames) },
    // What staging must hold (hdsAgentHeld): the snapshot less the extras.
    held: hdsAgentHeld(snapshot).map(
      (count, i) =>
        count - [extras.variables, extras.modes, extras.textStyles, extras.effectStyles][i].length,
    ),
    pageChars,
    maxPages: RECEIPT_MAX_PAGES,
  });

  // The slice must be the model, record for record, and plan exactly the full plan's writes.
  const sliceModel = hdsAgentSlice(snapshot, data);
  const exact = sliceModel.collections.every((c, i) => {
    const { variables, ...head } = c;
    const { variables: modelVariables, ...modelHead } = kept[i];
    return (
      same(head, modelHead) &&
      same(
        variables,
        modelVariables.filter((v) => variables.some((x) => x.path === v.path)),
      )
    );
  });
  const slicePlan = hdsPlan(sliceModel, snapshot, data.options);
  if (!exact || !same(writesOf(slicePlan), writes)) {
    refuse(
      `the change could not be cut into a slice that plans exactly like the full model (a match by name or codeSyntax that depends on variables outside it).${ROUTE_TO_SYNC}`,
    );
  }
  data.planSum = hdsChecksum(JSON.stringify(slicePlan));

  const text = [
    `if (figma.fileKey !== '${sync.stagingFileKey}' || figma.fileKey === '${sync.libraryFileKey}') {`,
    `  throw new Error('Refused: this is not the HDS staging file (${sync.stagingFileKey}). delta.js writes to staging only. Nothing was read or written.');`,
    '}',
    `// HDS figma:push --delta (hds#418): ${report.line}, model ${payload.modelHash}, commit ${commit.slice(0, 7)}.`,
    `// Generated by \`pnpm figma:push --delta\`; pass it to use_figma on staging unmodified (figma/README.md "Agent sync").`,
    `const PLAN = ${JSON.stringify(data)};`,
    `const PLAN_CHECKSUM = '${hdsChecksum(JSON.stringify(data))}';`,
    '',
    compactRuntime(),
    'return await hdsAgentRun(figma, PLAN, PLAN_CHECKSUM);',
    '',
  ].join('\n');
  if (text.length > DELTA_MAX_CHARS) {
    refuse(
      `delta.js would be ${text.length.toLocaleString('en-US')} characters, over its ${DELTA_MAX_CHARS.toLocaleString('en-US')} limit (use_figma takes 50,000).${ROUTE_TO_SYNC}`,
    );
  }
  return { ...report, text, chars: text.length };
}
