/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — the bound-colour fallback finder: what
 * figma/push/use-figma/fallbacks.js runs inside Figma, and the pure functions
 * scripts/__tests__/figma-fallbacks.test.mjs checks without Figma.
 *
 * A paint or effect bound to a colour variable also stores a raw "fallback"
 * colour, and Figma renders that raw colour where the binding cannot resolve
 * (a consumer file before the library is published, an unpublished change).
 * A binding whose raw colour was left at some other value therefore looks right
 * in the library and wrong everywhere else (hds, 2026-10-12: the Kbd drop
 * shadow was bound to color/border/strong over a pure black raw colour, so
 * Figma showed a black edge where code shows light grey).
 *
 * hdsReadFallbacks walks the library's pages, leaving out the Deprecated and
 * Archive pages and never descending into an instance (an instance shows its
 * main component's paints; the fix belongs there). For every SOLID fill or
 * stroke and every effect whose `boundVariables.color` is set, it resolves the
 * variable through its aliases to the collection's default-mode value and
 * records the node when the raw colour differs by more than 1/255 in any
 * channel (alpha too, for an effect: a paint's opacity is a separate field).
 * Only mismatches are returned, so the result stays small.
 *
 * Rules (scripts/__tests__/figma-fallbacks.test.mjs): top level holds only
 * `export function` / `export async function` plus the import of the runtime;
 * no module-level constants; ES2020. Read only: no write function is reachable
 * from here.
 */

import { hdsChecksum } from './figma-runtime.mjs';

/** One 8-bit channel of 1/255, plus float noise: the most a raw colour may differ from its variable. */
export function hdsFallbackTolerance() {
  return 1 / 255 + 1e-6;
}

/** "#rrggbb", or "#rrggbbaa" when `withAlpha`, for a Figma color ({ r, g, b, a? } in 0..1). */
export function hdsFallbackColorText(color, withAlpha) {
  const channel = (v) => ('0' + Math.round(v * 255).toString(16)).slice(-2);
  const alpha = typeof color.a === 'number' ? color.a : 1;
  return (
    '#' + channel(color.r) + channel(color.g) + channel(color.b) + (withAlpha ? channel(alpha) : '')
  );
}

/** True when `raw` differs from `expected` by more than one 8-bit step in any channel (alpha too when `withAlpha`). */
export function hdsFallbackDiffers(raw, expected, withAlpha) {
  const limit = hdsFallbackTolerance();
  const alpha = (c) => (typeof c.a === 'number' ? c.a : 1);
  return (
    Math.abs(raw.r - expected.r) > limit ||
    Math.abs(raw.g - expected.g) > limit ||
    Math.abs(raw.b - expected.b) > limit ||
    (withAlpha && Math.abs(alpha(raw) - alpha(expected)) > limit)
  );
}

/**
 * The colour variable `id` resolves to in its collection's default mode, as
 * `{ name, color }`, or null when it is not a colour, is unknown, or its alias
 * chain does not end (more than 16 hops).
 *
 * `index` is plain data (hdsFallbackIndex builds it from the library):
 * `{ variables: { [id]: { name, resolvedType, collectionId, valuesByMode } },
 *    defaultModes: { [collectionId]: modeId } }`.
 */
export function hdsFallbackResolve(index, id) {
  const first = index.variables[id];
  let current = first;
  for (let hop = 0; current && hop < 16; hop++) {
    if (current.resolvedType !== 'COLOR') return null;
    const value = current.valuesByMode[index.defaultModes[current.collectionId]];
    if (!value) return null;
    if (value.type === 'VARIABLE_ALIAS') {
      current = index.variables[value.id];
      continue;
    }
    return typeof value.r === 'number' ? { name: first.name, color: value } : null;
  }
  return null;
}

/**
 * The mismatches on one node: `{ nodeId, nodeName, page, kind, variable, raw,
 * expected }` for each SOLID fill or stroke and each effect whose bound colour
 * variable resolves to a colour the raw one differs from. `page` is the page's
 * name; `node` needs only the fields read here, so a test passes plain objects.
 */
export function hdsFallbackNode(node, page, index) {
  const found = [];
  const check = (kind, layer, withAlpha) => {
    const bound = layer && layer.boundVariables && layer.boundVariables.color;
    if (!bound || !layer.color) return;
    const want = hdsFallbackResolve(index, bound.id);
    if (!want || !hdsFallbackDiffers(layer.color, want.color, withAlpha)) return;
    found.push({
      nodeId: node.id,
      nodeName: node.name,
      page: page,
      kind: kind,
      variable: want.name,
      raw: hdsFallbackColorText(layer.color, withAlpha),
      expected: hdsFallbackColorText(want.color, withAlpha),
    });
  };
  const list = (value) => (Array.isArray(value) ? value : []);
  list(node.fills).forEach((paint) => paint.type === 'SOLID' && check('fill', paint, false));
  list(node.strokes).forEach((paint) => paint.type === 'SOLID' && check('stroke', paint, false));
  list(node.effects).forEach((effect) => check('effect', effect, true));
  return found;
}

/** Number of bound colours on one node (what hdsFallbackNode looked at), for the result's coverage count. */
export function hdsFallbackBindings(node) {
  const list = (value) => (Array.isArray(value) ? value : []);
  const bound = (layer) => Boolean(layer && layer.boundVariables && layer.boundVariables.color);
  return (
    list(node.fills).filter((p) => p.type === 'SOLID' && bound(p)).length +
    list(node.strokes).filter((p) => p.type === 'SOLID' && bound(p)).length +
    list(node.effects).filter(bound).length
  );
}

/**
 * Walks `node` and its descendants, adding to `tally` ({ nodes, bindings,
 * found }). An instance is checked itself but not entered. With `scope`
 * "components" only a COMPONENT or COMPONENT_SET and what is inside one is
 * checked; with "all" every node is.
 */
export function hdsFallbackWalk(node, page, index, scope, tally, inside) {
  const here =
    inside || scope === 'all' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
  if (here) {
    tally.nodes += 1;
    tally.bindings += hdsFallbackBindings(node);
    hdsFallbackNode(node, page, index).forEach((item) => tally.found.push(item));
  }
  if (node.type === 'INSTANCE' || !node.children) return;
  node.children.forEach((child) => hdsFallbackWalk(child, page, index, scope, tally, here));
}

/** The library's local variables and each collection's default mode, as the plain index hdsFallbackResolve reads. */
export async function hdsFallbackIndex(figma) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const index = { variables: {}, defaultModes: {} };
  collections.forEach((c) => (index.defaultModes[c.id] = c.defaultModeId));
  variables.forEach((v) => {
    index.variables[v.id] = {
      name: v.name,
      resolvedType: v.resolvedType,
      collectionId: v.variableCollectionId,
      valuesByMode: v.valuesByMode,
    };
  });
  return index;
}

/**
 * What fallbacks.js returns: the bound-colour fallback mismatches of the open
 * file. `options` is `{ scope: 'all' | 'components', skipPages: [pageId],
 * maxChars }`. The result is the record `pnpm figma:snapshot --fallbacks`
 * ingests into figma/snapshot.json (`bindingFallbacks`); its `checksum` is the
 * FNV-1a of the rest of the record, so a hand edit is refused. A result over
 * `maxChars` (a use_figma result holds about 20 KB) comes back as
 * `{ format, tooLarge: true, ... }` with the fix, never cut short.
 */
export async function hdsReadFallbacks(figma, options) {
  const index = await hdsFallbackIndex(figma);
  const tally = { nodes: 0, bindings: 0, found: [] };
  const pages = [];
  const skipped = [];
  for (const page of figma.root.children) {
    if (options.skipPages.indexOf(page.id) !== -1) {
      skipped.push({ id: page.id, name: page.name });
      continue;
    }
    await page.loadAsync();
    pages.push(page.name);
    page.children.forEach((child) =>
      hdsFallbackWalk(child, page.name, index, options.scope, tally, false),
    );
  }
  const byKey = (item) => item.page + '\n' + item.nodeId + '\n' + item.kind;
  tally.found.sort((a, b) => (byKey(a) < byKey(b) ? -1 : byKey(a) > byKey(b) ? 1 : 0));
  const record = {
    format: 'binding-fallbacks',
    schemaVersion: 1,
    file: typeof figma.fileKey === 'string' ? figma.fileKey : null,
    takenAt: new Date().toISOString(),
    scope: options.scope,
    pages: pages.length,
    skippedPages: skipped,
    nodes: tally.nodes,
    bindings: tally.bindings,
    mismatches: tally.found,
  };
  record.checksum = hdsChecksum(JSON.stringify(record));
  const chars = JSON.stringify(record).length;
  if (chars > options.maxChars) {
    return {
      format: 'binding-fallbacks',
      tooLarge: true,
      file: record.file,
      chars: chars,
      mismatches: tally.found.length,
      next:
        tally.found.length +
        ' bound-colour fallback mismatches are too many for one use_figma result (' +
        chars +
        ' characters, limit ' +
        options.maxChars +
        "). fallbacks.js does not page. Fix the first ones in Figma (set the raw colour to the variable's value; keep the binding), run it again, and repeat.",
    };
  }
  return record;
}
