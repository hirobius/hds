/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — what figma/push/use-figma/delta.js runs inside
 * Figma, through the Figma MCP server's use_figma tool (hds#418, hds#397 C3:
 * zero-click agent sync). `pnpm figma:push --delta` copies the functions it
 * reaches into delta.js, after the runtime (figma-runtime.mjs), the snapshot
 * delta codec and the Sync receipt writer (figma-sync-runtime.mjs), minus
 * `export`, the imports and comments. Node imports them to build and test it.
 *
 * Rules (scripts/__tests__/figma-agent-sync.test.mjs enforces them): top level
 * holds only `export function` / `export async function` plus imports of the
 * runtime, the codec and the Sync runtime; no module-level constants; ES2020.
 *
 * use_figma reads differently from a plugin (measured live 2026-10-01, on the
 * staging copy that became the library, hds#397 and hds#418): a variable's
 * `description` getter returns HTML-escaped text (" &quot;, ' &#39;, < &lt;,
 * > &gt;, & &amp;) while a write stores the raw string as given, and
 * `figma.root.name` is "Document".
 * So delta.js writes the model's raw text and decodes every read
 * (hdsAgentReadState). The Sync and promote plugins never carry this file.
 */

import {
  hdsApply,
  hdsChecksum,
  hdsFontPreflight,
  hdsGetKey,
  hdsPlan,
  hdsReadState,
  hdsSetKey,
} from './figma-runtime.mjs';
import { snapshotDelta } from './figma-snapshot-delta.mjs';
import { hdsSyncReceipt, hdsSyncWriteReceipt } from './figma-sync-runtime.mjs';

/** A description as use_figma's getter returns it, back to the stored text: `&amp;` last, so typed entity text survives. */
export function hdsAgentDecode(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * hdsReadState as a plugin would read the file: every variable description
 * decoded, and `file` set to the committed snapshot's (use_figma names the
 * root "Document" and gives the file key, where the plugin gave none).
 */
export async function hdsAgentReadState(figma, file) {
  const state = await hdsReadState(figma);
  state.collections.forEach((c) =>
    c.variables.forEach((v) => (v.description = hdsAgentDecode(v.description))),
  );
  state.file = Object.assign({}, file);
  return state;
}

/**
 * A state variable as a model record (the push model's shape): what the model
 * holds when nothing about the variable changed. Aliases name their target by
 * `pathOf` (state id -> token path).
 */
export function hdsAgentVariable(v, path, pathOf) {
  const values = {};
  Object.keys(v.valuesByMode).forEach((mode) => {
    const entry = v.valuesByMode[mode];
    values[mode] =
      entry && ('alias' in entry ? { alias: pathOf.get(entry.alias) } : { value: entry.value });
  });
  return {
    path: path,
    name: v.name,
    resolvedType: v.resolvedType,
    description: v.description,
    scopes: v.scopes.slice(),
    hiddenFromPublishing: v.hiddenFromPublishing,
    codeSyntax: Object.assign({}, v.codeSyntax),
    valuesByMode: values,
  };
}

/**
 * What `state` holds, counted the way delta.js checks it never leaves an
 * extra behind: variables, modes, and the text and effect styles HDS stamped
 * (a style without a path is never an extra). `pnpm figma:push --delta` bakes
 * the committed snapshot's count less its full plan's extras; the library
 * must hold exactly that.
 */
export function hdsAgentHeld(state) {
  const sum = (key) => state.collections.reduce((n, c) => n + c[key].length, 0);
  const stamped = (styles) => styles.filter((s) => s.path).length;
  return [sum('variables'), sum('modes'), stamped(state.textStyles), stamped(state.effectStyles)];
}

/**
 * The paths of the text and effect styles `plan` writes a description to
 * that holds a character use_figma escapes in a variable description
 * (" ' < > &). Whether it escapes a style description on read is not
 * measured yet, so delta.js refuses such a plan before any write
 * (pnpm figma:push --delta first, then the library again), and Sync makes it.
 */
export function hdsAgentStyleText(plan) {
  return plan.textStyles
    .concat(plan.effectStyles)
    .filter(
      (s) =>
        /["'<>&]/.test(s.set.description) &&
        (s.action === 'create' || s.changes.indexOf('description') !== -1),
    )
    .map((s) => s.path);
}

/**
 * The model slice delta.js plans with: the collections, variables and styles
 * the change touches, plus every variable they alias. `data.slice` holds
 * `[key, collectionId, patch, variables]` per collection and
 * `[path, variableId, patch]` per variable: an id names the record in
 * `state` the entry starts from, `patch` the model fields that differ from it
 * (everything, for a record not in Figma yet). Text and effect styles come whole.
 */
export function hdsAgentSlice(state, data) {
  const byId = new Map();
  state.collections.forEach((c) => {
    byId.set(c.id, c);
    c.variables.forEach((v) => byId.set(v.id, v));
  });
  const pathOf = new Map();
  data.slice.forEach((c) => c[3].forEach((v) => v[1] && pathOf.set(v[1], v[0])));
  return {
    collections: data.slice.map((c) => {
      const sc = byId.get(c[1]);
      const head = sc
        ? {
            key: c[0],
            name: sc.name,
            modes: sc.modes.slice(),
            hiddenFromPublishing: sc.hiddenFromPublishing,
          }
        : { key: c[0] };
      return Object.assign(head, c[2], {
        variables: c[3].map((v) =>
          Object.assign(
            v[1] ? hdsAgentVariable(byId.get(v[1]), v[0], pathOf) : { path: v[0] },
            v[2],
          ),
        ),
      });
    }),
    textStyles: data.textStyles,
    effectStyles: data.effectStyles,
  };
}

/**
 * delta.js: refuses unless this is the library and its data is intact, pins
 * the library to the committed snapshot, refuses when it holds more than
 * the model (it never deletes), plans the slice against it (the plan
 * figma:push --delta made, or refuses), applies it, re-plans to 0, stamps
 * lastPush and the C2 receipt (raw pages: use_figma has no
 * CompressionStream), and returns the receipt as receipt.js reads page 0,
 * or only its head when it needs more than one page. Every refusal before
 * the apply writes nothing.
 */
export async function hdsAgentRun(figma, data, checksum) {
  const sync =
    ' Ask Adrian to run Sync in the library (Plugins > Development > HDS tokens sync > Sync).';
  const refuse = (why, next) => {
    throw new Error('Refused: ' + why + ' Nothing was written.' + next);
  };
  if (figma.fileKey !== data.files.library || data.files.retired.indexOf(figma.fileKey) !== -1) {
    refuse('this is not the HDS library (' + data.files.library + ').', '');
  }
  if (hdsChecksum(JSON.stringify(data)) !== checksum) {
    refuse(
      'PLAN does not match PLAN_CHECKSUM: delta.js changed after pnpm figma:push --delta wrote it (a copy or transcription error).',
      ' Regenerate it and pass it unmodified.',
    );
  }
  const base = await hdsAgentReadState(figma, data.base.file);
  base.takenAt = data.base.takenAt;
  const live = hdsChecksum(JSON.stringify(base));
  if (live !== data.base.checksum) {
    refuse(
      'the library (' +
        live +
        ') is not the committed figma/snapshot.json (' +
        data.base.checksum +
        '): something changed it after that snapshot was taken (a Sync whose receipt was not collected, another push, a hand edit).',
      ' If a Sync ran, collect its receipt (receipt.js); otherwise' +
        sync.replace(' Ask', ' ask') +
        ' Then collect its receipt.',
    );
  }
  const prune =
    ' A deliberate deletion or prune uses the promote plugin (pnpm figma:push --prune).';
  const held = hdsAgentHeld(base);
  if (held.join() !== data.held.join()) {
    refuse(
      'the library holds ' +
        held.reduce((n, count, i) => n + count - data.held[i], 0) +
        ' item(s) the model does not have, and delta.js never deletes.',
      prune,
    );
  }
  const model = hdsAgentSlice(base, data);
  const plan = hdsPlan(model, base, data.options);
  const gone = plan.removals;
  if (
    gone.variables.length + gone.textStyles.length + gone.effectStyles.length + gone.modes.length ||
    plan.collections.some((c) => c.modes.remove.length)
  ) {
    refuse('the plan deletes, and delta.js never deletes.', prune);
  }
  if (hdsChecksum(JSON.stringify(plan)) !== data.planSum) {
    refuse('the plan made in the library is not the one pnpm figma:push --delta made.', sync);
  }
  const styled = hdsAgentStyleText(plan);
  if (styled.length) {
    refuse(
      'the plan writes a style description holding one of " \' < > & (' +
        styled.join(', ') +
        "), and use_figma's read of a style description is not measured yet.",
      sync,
    );
  }
  const problems = plan.conflicts.concat(await hdsFontPreflight(figma, plan));
  if (problems.length) refuse(problems.join(' | '), sync);
  try {
    await hdsApply(figma, plan);
  } catch (error) {
    throw new Error(
      error.message + ' Some changes may already be applied.' + sync + ' It finishes the push.',
    );
  }
  const after = hdsPlan(model, await hdsAgentReadState(figma, data.base.file), data.options);
  const left = after.collections
    .concat(after.variables, after.textStyles, after.effectStyles)
    .filter((item) => item.action !== 'unchanged').length;
  if (left) {
    throw new Error(
      'The push ran but the library still differs from the model in ' +
        left +
        ' item(s); lastPush and the receipt were not written.' +
        sync,
    );
  }
  hdsSetKey(
    figma.root,
    'lastPush',
    JSON.stringify({ modelHash: data.modelHash, pushedAt: new Date().toISOString(), scope: null }),
  );
  const post = await hdsAgentReadState(figma, data.base.file);
  const body = JSON.stringify(snapshotDelta(base, post));
  const pages = [];
  for (let at = 0, end = 0; at < body.length; at = end) {
    end = at + data.pageChars;
    if (end < body.length && end - 1 > at && /[\uD800-\uDBFF]/.test(body[end - 1])) end -= 1;
    pages.push(body.slice(at, end));
  }
  const snap = { snapshot: post, checksum: hdsChecksum(JSON.stringify(post)) };
  // PLAN carries what the head records: the commit and modelHash (as a Sync
  // bundle does), the plan line (as a push report does), and the base.
  const head = hdsSyncReceipt(data, data, snap, 'delta.js ' + checksum, data.base);
  head.format = 'json';
  head.pages = pages.length;
  head.sum = hdsChecksum(body);
  try {
    hdsSyncWriteReceipt(figma, head, pages, data);
  } catch (error) {
    throw new Error(
      'Pushed and stamped lastPush, but the receipt was not written: ' +
        error.message +
        sync +
        ' It changes nothing and writes the receipt.',
    );
  }
  const get = (key) => hdsGetKey(figma.root, key) || '';
  if (pages.length > 1) {
    return {
      file: figma.fileKey,
      head: get('syncReceipt'),
      line: data.line,
      next:
        'Run receipt.js with PAGE 0 to ' +
        (pages.length - 1) +
        ', then pnpm figma:snapshot --from-receipt with every result.',
    };
  }
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  return {
    file: figma.fileKey,
    page: 0,
    head: get('syncReceipt'),
    text: get('syncSnapshot.0'),
    live: {
      lastPush: get('lastPush'),
      collections: collections.length,
      modes: collections.reduce((n, c) => n + c.modes.length, 0),
      variables: (await figma.variables.getLocalVariablesAsync()).length,
      textStyles: (await figma.getLocalTextStylesAsync()).length,
      effectStyles: (await figma.getLocalEffectStylesAsync()).length,
    },
    line: data.line,
  };
}
