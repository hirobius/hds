/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — builds figma/push/use-figma/delta.js, the zero-click
 * agent sync (hds#418, hds#397 C3): one use_figma call that applies a merged
 * token change to the library and writes the Sync receipt, with no step by
 * Adrian (ADR-026, amended 2026-10-07). HDS Staging, the draft workbench of
 * amendment A4, has no local variables and is never a delta.js target.
 *
 * `pnpm figma:push --delta` plans offline against the committed
 * figma/snapshot.json and bakes into delta.js:
 *   - PLAN: the change as a model slice (the variables, collections and
 *     styles the plan touches, as patches over what the library holds, plus
 *     every variable they alias, as anchors), the pin (the committed checksum,
 *     takenAt and file), the library key and the retired keys, and the
 *     checksum of the plan the slice gives against the snapshot;
 *   - PLAN_CHECKSUM over PLAN, and the runtime delta.js reaches
 *     (figma-agent-runtime.mjs hdsAgentRun: hdsApply, hdsPlan, hdsReadState,
 *     hdsFontPreflight, the snapshot delta codec and the C2 receipt writer),
 *     checked by hdsVerifyRuntime like every use_figma carrier.
 * Its first statement refuses any file but the library. See hdsAgentRun for what
 * it checks and does in Figma.
 *
 * It refuses to build, naming the route. To Sync: a plan that moves
 * variables between collections, has conflicts, or writes a text or effect
 * style description holding " ' < > & (use_figma's read of one is not
 * measured). To the promote plugin, because delta.js and Sync never delete:
 * --prune, and any variable, mode or style the library holds that the model
 * does not (an extra, such as a token deleted from hirobius.tokens.json).
 * delta.js counts the extras again in the library.
 *
 * Size. use_figma takes 50,000 characters and returns about 20 KB; the runtime
 * alone is about 38,000 of them (41,000 in a part). A plan whose delta.js fits DELTA_MAX_CHARS
 * (45,000) is one delta.js, exactly as before. A bigger one is cut into
 * ordered parts, delta-1-of-N.js ... delta-N-of-N.js, each a complete script
 * under DELTA_MAX_CHARS with every guard of delta.js (hdsAgentPartRun in
 * figma-agent-runtime.mjs): collections first, then variables in alias order
 * (a target before the variables that alias it), then text and effect styles,
 * so no part depends on a later one. A part runs only after the one before it
 * (a progress marker in the file), a part that already ran changes nothing,
 * and each part's receipt is a delta against the state before it, which
 * `pnpm figma:snapshot --from-receipt` chains. ADR-033, amendment 2026-10-09.
 */

import {
  hdsChecksum,
  hdsDescribePlan,
  hdsPlan,
  hdsPlanWarnings,
  hdsSummarize,
  hdsSummaryLine,
} from './figma-runtime.mjs';
import {
  agentRuntimeSource,
  buildPushPayload,
  deltaRuntimeSource,
  emitVerifiedRuntime,
  reachableRuntime,
  runtimeSource,
  syncConfigFromLinks,
  syncRuntimeSource,
  useFigmaLibraryGuard,
} from './figma-scripts.mjs';
import {
  hdsAgentDigest,
  hdsAgentHeld,
  hdsAgentSlice,
  hdsAgentStyleText,
  hdsAgentVariable,
} from './figma-agent-runtime.mjs';

/** The most characters delta.js (or one part of it) may have: use_figma takes 50,000, and an agent retypes it. */
export const DELTA_MAX_CHARS = 45000;
/**
 * What the splitter fills a part to. The runtime a part carries is about
 * 41,000 characters (a lone delta.js needs 38,000), so each part has room for
 * only 3,000 to 4,000 characters of change: the 500 under DELTA_MAX_CHARS is
 * headroom, and parts are measured as the real scripts, not estimated.
 */
export const DELTA_PART_CHARS = 44500;
/** Receipt pages (C2): delta.js returns the receipt inline when it fits one page. */
export const DELTA_PAGE_CHARS = 15000;
const RECEIPT_MAX_PAGES = 64;
/** Where a deletion goes instead: delta.js and Sync never delete. */
const ROUTE_TO_PROMOTE =
  ' A deliberate deletion or prune uses the promote plugin (pnpm figma:push --prune), from Figma desktop (figma/README.md "Promote plugin and use_figma scripts"). No delta.js was written.';
/** Why --delta never builds with --prune. */
export const DELTA_PRUNE_REFUSAL = `delta.js refused: it never deletes, so --delta refuses --prune.${ROUTE_TO_PROMOTE}`;
const ROUTE_TO_SYNC =
  ' Route it to Sync: ask Adrian to run Sync in the library (Plugins > Development > HDS tokens sync > Sync), then collect its receipt (figma/README.md "Agent: collect a sync"). No delta.js was written.';

const canonical = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const changed = (item) => item.action !== 'unchanged' || item.stampKey;
const refuse = (why) => {
  throw new Error(`delta.js refused: ${why}`);
};

/** compactRuntime's result per entry function: the syntax-tree check is slow, and a split asks for it once per part. */
const compacted = new Map();

/**
 * The runtime delta.js reaches, compacted (use_figma takes 50,000
 * characters): no indentation, no blank lines, and no line break after
 * ( [ { , or before ) ] } . ? : (Prettier's wrapping), plus the
 * hdsVerifyRuntime statement over exactly that text. Throws if compacting
 * changed what the code means (a template literal spanning lines).
 */
function compactRuntime(entry = 'hdsAgentRun') {
  if (compacted.has(entry)) return compacted.get(entry);
  const source = [
    runtimeSource(),
    deltaRuntimeSource(),
    syncRuntimeSource(),
    agentRuntimeSource(),
  ].join('\n\n');
  const functions = reachableRuntime([entry], source);
  // delta.js never prunes, so a refusal names the Sync plugin.
  const text = emitVerifiedRuntime(functions);
  compacted.set(entry, text);
  return text;
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
function sliceOf(push, snapshot, plan, select = null) {
  const pick = (kind, id) => !select || select[kind].has(id);
  const stateById = new Map();
  snapshot.collections.forEach((c) => {
    stateById.set(c.id, c);
    c.variables.forEach((v) => stateById.set(v.id, v));
  });
  const picked = (kind) => plan[kind].filter((s) => changed(s) && pick(kind, s.path));
  const textStyles = picked('textStyles').map((s) => s.set);
  const effectStyles = picked('effectStyles').map((s) => s.set);
  const want = new Set(
    plan.variables.filter((v) => changed(v) && pick('variables', v.path)).map((v) => v.path),
  );
  textStyles.forEach((s) => Object.values(s.boundVariables).forEach((path) => want.add(path)));
  const recordOf = new Map(push.collections.flatMap((c) => c.variables.map((v) => [v.path, v])));
  for (const path of want) {
    const record = recordOf.get(path);
    if (!record) continue;
    Object.values(record.valuesByMode).forEach(
      (entry) => 'alias' in entry && want.add(entry.alias),
    );
  }
  const collectionWrites = new Set(
    plan.collections.filter((c) => changed(c) && pick('collections', c.key)).map((c) => c.key),
  );
  const planned = new Map(plan.collections.map((c) => [c.key, c]));
  // In a part: records an earlier part already wrote start from the library as that part left it, with no patch.
  const earlier = (kind, id, item) => select && changed(item) && !select[kind].has(id);
  const kept = push.collections.filter(
    (c) => collectionWrites.has(c.key) || c.variables.some((v) => want.has(v.path)),
  );
  const pathOf = new Map();
  kept.forEach((c) =>
    c.variables.forEach(
      (v) => want.has(v.path) && plan.index[v.path] && pathOf.set(plan.index[v.path], v.path),
    ),
  );
  const items = new Map(plan.variables.map((v) => [v.path, v]));
  const item = (v) => items.get(v.path);
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
        return [v.path, vid, vid && earlier('variables', v.path, item(v)) ? {} : patchOf(start, v)];
      });
    return [
      c.key,
      id,
      id && earlier('collections', c.key, planned.get(c.key)) ? {} : patchOf(from, c),
      variables,
    ];
  });
  const storedPaths = [...pathOf.keys()]
    .map((id) => stateById.get(id).path)
    .concat(
      picked('textStyles').map((s) => s.id && snapshot.textStyles.find((x) => x.id === s.id).path),
      picked('effectStyles').map(
        (s) => s.id && snapshot.effectStyles.find((x) => x.id === s.id).path,
      ),
    )
    .filter(Boolean);
  return { slice, textStyles, effectStyles, kept, storedPaths };
}

/**
 * delta.js for the change from the committed snapshot to `model`, or a
 * refusal (an Error whose message names the cause and the route to Sync).
 *
 * @param {object} model  The Figma model.
 * @param {{ renames?: object, snapshotFile: {checksum: string, snapshot: object}|null, links: object, commit: string, prune?: boolean, pageChars?: number, maxChars?: number, partChars?: number, split?: boolean }} options
 *   maxChars and partChars are the limits, and split cuts the plan into parts even when one
 *   script would fit: all three exist for tests that need a small plan in many parts.
 * @returns {{ text: string|null, parts?: {file: string, text: string, chars: number}[], run?: string, planHash?: string, chars: number, line: string, changes: string[], warnings: string[], base: string, modelHash: string, commit: string, library: string, nothing?: string }}
 */
export function buildUseFigmaDeltaScript(
  model,
  {
    renames = {},
    snapshotFile,
    links,
    commit,
    prune = false,
    pageChars = DELTA_PAGE_CHARS,
    maxChars = DELTA_MAX_CHARS,
    partChars = DELTA_PART_CHARS,
    split = false,
  },
) {
  if (prune) throw new Error(DELTA_PRUNE_REFUSAL);
  const sync = syncConfigFromLinks(links);
  if (!snapshotFile) {
    refuse(`there is no committed figma/snapshot.json to pin the library to.${ROUTE_TO_SYNC}`);
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
    library: sync.libraryFileKey,
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
      `the library holds ${extra.length} item(s) the model does not have (${extra.join('; ')}), and delta.js never deletes.${ROUTE_TO_PROMOTE}`,
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
      nothing: `the library already holds model ${payload.modelHash} (figma/snapshot.json ${snapshotFile.checksum}): nothing to sync, so no delta.js was written.`,
    };
  }

  const { slice, textStyles, effectStyles, kept, storedPaths } = sliceOf(push, snapshot, plan);
  // What the library must hold (hdsAgentHeld): the snapshot less the extras.
  const held = hdsAgentHeld(snapshot).map(
    (count, i) =>
      count - [extras.variables, extras.modes, extras.textStyles, extras.effectStyles][i].length,
  );
  const common = {
    files: { library: sync.libraryFileKey, retired: sync.retiredFileKeys },
    base: { checksum: snapshotFile.checksum, takenAt: snapshot.takenAt, file: snapshot.file },
    modelHash: payload.modelHash,
    commit,
    line: report.line,
  };
  const data = canonical({
    ...common,
    slice,
    textStyles,
    effectStyles,
    options: { prune: false, scope: null, renames: usedRenames(storedPaths, renames) },
    held,
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
    useFigmaLibraryGuard(sync, 'delta.js writes to the library only.'),
    `// HDS figma:push --delta (hds#418): ${report.line}, model ${payload.modelHash}, commit ${commit.slice(0, 7)}.`,
    `// Generated by \`pnpm figma:push --delta\`; pass it to use_figma on the library unmodified (figma/README.md "Agent sync").`,
    `const PLAN = ${JSON.stringify(data)};`,
    `const PLAN_CHECKSUM = '${hdsChecksum(JSON.stringify(data))}';`,
    '',
    compactRuntime(),
    'return await hdsAgentRun(figma, PLAN, PLAN_CHECKSUM);',
    '',
  ].join('\n');
  if (!split && text.length <= maxChars) return { ...report, text, chars: text.length };

  const parts = splitIntoParts({
    push,
    snapshot,
    plan,
    writes,
    sync,
    common,
    held,
    options: data.options,
    renames,
    pageChars,
    partChars: Math.min(partChars, maxChars),
    maxChars,
  });
  return {
    ...report,
    text: null,
    chars: Math.max(...parts.files.map((file) => file.chars)),
    parts: parts.files,
    run: parts.run,
    planHash: parts.planHash,
  };
}

/**
 * The units a plan splits along, in the order their parts run: changed
 * collections, then variables with every alias target before the variables
 * that alias it (so a part never needs a later one), then text styles, then
 * effect styles (which bind variables, so they come last).
 */
function unitsOf(push, plan) {
  const units = plan.collections.filter(changed).map((c) => ({ kind: 'collections', id: c.key }));
  const recordOf = new Map(push.collections.flatMap((c) => c.variables.map((v) => [v.path, v])));
  const todo = new Set(plan.variables.filter(changed).map((v) => v.path));
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    Object.values(recordOf.get(path).valuesByMode).forEach(
      (entry) => 'alias' in entry && todo.has(entry.alias) && visit(entry.alias),
    );
    units.push({ kind: 'variables', id: path });
  };
  [...todo].forEach(visit);
  plan.textStyles.filter(changed).forEach((s) => units.push({ kind: 'textStyles', id: s.path }));
  plan.effectStyles
    .filter(changed)
    .forEach((s) => units.push({ kind: 'effectStyles', id: s.path }));
  return units;
}

const emptySelection = () => ({
  collections: new Set(),
  variables: new Set(),
  textStyles: new Set(),
  effectStyles: new Set(),
});

/**
 * The plan cut into parts under `partChars` (and never over `maxChars`):
 * { files: [{ file, text, chars }], run, planHash }. Parts are packed
 * greedily in unit order, measured as the real scripts, so every part is as
 * full as it can be; a part holds, besides its own changes, the anchors they
 * need (variables they alias, created by an earlier part or already there).
 */
function splitIntoParts({
  push,
  snapshot,
  plan,
  writes,
  sync,
  common,
  held,
  options,
  renames,
  pageChars,
  partChars,
  maxChars,
}) {
  const planHash = hdsChecksum(JSON.stringify(writes));
  const run = hdsChecksum(
    JSON.stringify([planHash, common.base.checksum, common.modelHash, common.commit]),
  );
  const units = unitsOf(push, plan);
  const render = (select, i, n, id, hash) => {
    const sliced = sliceOf(push, snapshot, plan, select);
    const data = canonical({
      ...common,
      part: { run: id, plan: hash, i, n },
      slice: sliced.slice,
      textStyles: sliced.textStyles,
      effectStyles: sliced.effectStyles,
      options: { ...options, renames: usedRenames(sliced.storedPaths, renames) },
      held,
      pageChars,
      maxPages: RECEIPT_MAX_PAGES,
    });
    data.planSum = hdsAgentDigest(hdsAgentSlice(snapshot, data), data);
    return [
      useFigmaLibraryGuard(sync, 'delta.js writes to the library only.'),
      `// HDS figma:push --delta, part ${i} of ${n}, run ${id}: run the parts in order, each unmodified (figma/README.md "Agent sync").`,
      `const PLAN = ${JSON.stringify(data)};`,
      `const PLAN_CHECKSUM = '${hdsChecksum(JSON.stringify(data))}';`,
      '',
      compactRuntime('hdsAgentPartRun'),
      'return await hdsAgentPartRun(figma, PLAN, PLAN_CHECKSUM);',
      '',
    ].join('\n');
  };
  const sized = (select) => render(select, 99, 99, '00000000', '00000000').length;
  const add = (select, unit) => {
    const next = {
      collections: new Set(select.collections),
      variables: new Set(select.variables),
      textStyles: new Set(select.textStyles),
      effectStyles: new Set(select.effectStyles),
    };
    next[unit.kind].add(unit.id);
    return next;
  };
  const kindName = { collections: 'collection', variables: 'variable' };
  // Pack to `budget`; a part that comes out over `maxChars` (more digits than the placeholders) is repacked tighter.
  for (let budget = partChars; budget > partChars - 4000; budget -= 250) {
    const selections = [];
    let current = null;
    for (const unit of units) {
      const grown = add(current || emptySelection(), unit);
      if (current && sized(grown) <= budget) {
        current = grown;
        continue;
      }
      if (current) selections.push(current);
      current = add(emptySelection(), unit);
      const length = sized(current);
      if (length > maxChars) {
        refuse(
          `${kindName[unit.kind] || 'style'} ${unit.id} alone makes a ${length.toLocaleString('en-US')}-character part, over the ${maxChars.toLocaleString('en-US')} limit (use_figma takes 50,000).${ROUTE_TO_SYNC}`,
        );
      }
    }
    selections.push(current);
    const n = selections.length;
    const files = selections.map((select, k) => {
      const text = render(select, k + 1, n, run, planHash);
      return { file: `delta-${k + 1}-of-${n}.js`, text, chars: text.length };
    });
    if (files.every((file) => file.chars <= maxChars)) return { files, run, planHash };
  }
  return refuse(
    `the plan could not be cut into parts under ${maxChars.toLocaleString('en-US')} characters.${ROUTE_TO_SYNC}`,
  );
}
