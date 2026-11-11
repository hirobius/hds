/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * figma-deprecated-styles (hds#483): which Figma text styles and variables are
 * deprecated, read from the tokens' `$deprecated` notes (lib/token-deprecations,
 * the same data as the shipped deprecations.json), never a hand list.
 *
 * PR #1463 applied typography/eyebrow (deprecated, use caption) to four AppShell
 * texts. Three guards stop that happening again:
 *   - deprecatedStyleDescription: the model writes "Deprecated. Will be removed
 *     in <v> (<issue>). Use <style>." at the start of the style's description,
 *     so designers see it in Figma's style picker;
 *   - assertLiveTextStyle / hdsApplyTextStyle / textStyleScript: every agent
 *     script that applies a text style refuses a deprecated one, when it is
 *     built and again in Figma;
 *   - deprecatedUsageScript: the read-only audit whose result
 *     check-figma-deprecated-usage reads (figma/deprecated-usage.json).
 *
 * Pure: no fs.
 */
import { collectDeprecations, removeInOf } from './token-deprecations.mjs';
import { walkTokens } from './token-tree.mjs';

/** A typography token path → its Figma text style name (figma-model: path minus the tier). */
export const styleNameOf = (path) => path.split('.').slice(1).join('/');

const ISSUE_RE = /\b[\w-]*#\d+\b/;
const USE_RE = /\buse\s+((?:primitive|semantic|role|component)(?:\.[\w-]+)+)/;

/**
 * What a `$deprecated` note on a typography token says, as the style
 * description needs it (the model calls this; no tree needed).
 */
export function styleDeprecation(note) {
  const use = USE_RE.exec(String(note))?.[1] ?? null;
  return {
    removeIn: removeInOf(note),
    issue: ISSUE_RE.exec(String(note))?.[0] ?? null,
    replacementStyle: use ? styleNameOf(use) : null,
    note: String(note),
  };
}

/** The description a text style carries in Figma: the deprecation line first when deprecated. */
export function textStyleDescription(token) {
  if (!token.deprecated) return token.description ?? '';
  const own =
    token.description && !/^deprecated\b/i.test(token.description) ? ` ${token.description}` : '';
  return `${deprecatedStyleDescription(styleDeprecation(token.deprecated))}${own}`;
}

/**
 * @param {object} tree hirobius.tokens.json
 * @returns {Array<{ style: string, path: string, replacement: string|null,
 *   replacementStyle: string|null, removeIn: string|null, issue: string|null, note: string }>}
 */
export function deprecatedTextStyles(tree) {
  const typography = new Set();
  for (const t of walkTokens(tree)) if (t.type === 'typography') typography.add(t.path.join('.'));
  return collectDeprecations(tree)
    .filter((d) => typography.has(d.path))
    .map((d) => ({
      style: styleNameOf(d.path),
      path: d.path,
      replacement: d.replacement,
      replacementStyle:
        d.replacement && typography.has(d.replacement) ? styleNameOf(d.replacement) : null,
      removeIn: d.removeIn,
      issue: ISSUE_RE.exec(d.note)?.[0] ?? null,
      note: d.note,
    }))
    .sort((a, b) => a.style.localeCompare(b.style));
}

/** The first line of a deprecated style's description in Figma. */
export function deprecatedStyleDescription(rec) {
  const when = rec.removeIn ? ` Will be removed in ${rec.removeIn}` : ' Will be removed';
  const issue = rec.issue ? ` (${rec.issue})` : '';
  const use = rec.replacementStyle ? ` Use ${rec.replacementStyle}.` : ` ${rec.note}.`;
  return `Deprecated.${when}${issue}.${use}`;
}

/** Throws when `styleName` is a deprecated text style. */
export function assertLiveTextStyle(styleName, deprecated) {
  const hit = deprecated.find((d) => d.style === styleName);
  if (!hit) return;
  throw new Error(
    `${styleName} is deprecated (${hit.note}); apply ${hit.replacementStyle ?? 'a live style'} instead.`,
  );
}

/**
 * Runtime (embedded in use_figma scripts): applies `style` to a text node,
 * refusing a deprecated style by name, with fonts loaded first.
 */
export async function hdsApplyTextStyle(node, style, deprecatedNames) {
  if (deprecatedNames.includes(style.name))
    throw new Error(`hds: ${style.name} is deprecated; refusing to apply it to ${node.id}.`);
  if (typeof figma !== 'undefined') {
    if (style.fontName) await figma.loadFontAsync(style.fontName);
    if (node.characters && node.characters.length)
      for (const f of node.getRangeAllFontNames(0, node.characters.length))
        await figma.loadFontAsync(f);
  }
  await node.setTextStyleIdAsync(style.id);
}

/** The guard prelude every generated script that touches text styles carries. */
export function guardPrelude(tree) {
  const names = deprecatedTextStyles(tree).map((d) => d.style);
  return `const HDS_DEPRECATED_STYLES = ${JSON.stringify(names)};\n${hdsApplyTextStyle.toString()}\n`;
}

/**
 * A use_figma script that applies text styles by name to the named nodes.
 * Refuses to build when any assignment names a deprecated style.
 * @param {Array<{ id: string, style: string }>} assignments
 */
export function textStyleScript(assignments, tree) {
  const deprecated = deprecatedTextStyles(tree);
  for (const a of assignments) assertLiveTextStyle(a.style, deprecated);
  return `${guardPrelude(tree)}
const ASSIGN = ${JSON.stringify(assignments)};
const styles = new Map((await figma.getLocalTextStylesAsync()).map((s) => [s.name, s]));
const out = [];
for (const a of ASSIGN) {
  const node = await figma.getNodeByIdAsync(a.id);
  const style = styles.get(a.style);
  if (!node || node.type !== 'TEXT' || !style) { out.push({ id: a.id, error: !node ? 'missing' : !style ? 'no style ' + a.style : 'not text' }); continue; }
  const before = node.textStyleId === figma.mixed ? 'mixed' : ([...styles.values()].find((s) => s.id === node.textStyleId)?.name ?? node.textStyleId);
  await hdsApplyTextStyle(node, style, HDS_DEPRECATED_STYLES);
  out.push({ id: a.id, before, after: style.name });
}
return out;
`;
}

/**
 * The library ids of deprecated text styles and variables, from the committed
 * snapshot. A variable counts when its path is a deprecated token or under one
 * (typography sub-variables, the Density copy `density.<path>`).
 */
export function deprecatedUsageTargets(tree, snapshot) {
  const all = collectDeprecations(tree).map((d) => d.path);
  const styleNames = new Set(deprecatedTextStyles(tree).map((d) => d.style));
  const under = (p) =>
    all.some((d) => {
      if (!p) return false;
      const bare = p.startsWith('density.') ? p.slice('density.'.length) : p;
      return bare === d || bare.startsWith(`${d}.`);
    });
  return {
    styles: (snapshot.textStyles ?? [])
      .filter((s) => styleNames.has(s.name))
      .map((s) => ({ id: s.id, name: s.name })),
    variables: (snapshot.collections ?? [])
      .flatMap((c) => c.variables)
      .filter((v) => under(v.path))
      .map((v) => ({ id: v.id, name: v.name, path: v.path })),
  };
}

/**
 * Runtime: every node outside the Archive and Deprecated pages that uses a
 * deprecated text style (whole node or a styled segment) or is bound to a
 * deprecated variable. `api` abstracts the Plugin API so tests run on objects.
 */
export function hdsAuditDeprecatedUsage(pages, targets, api) {
  // History pages (ADR-026): "Archive", "Deprecated", "Archive / Deprecated".
  const skip = (name) => /^(Archive|Deprecated)\b/.test(name);
  const styleById = new Map(targets.styles.map((s) => [s.id, s.name]));
  const varById = new Map(targets.variables.map((v) => [v.id, v.name]));
  const hits = [];
  const boundIds = (bv) => {
    const ids = [];
    const visit = (x) => {
      if (!x) return;
      if (Array.isArray(x)) x.forEach(visit);
      else if (typeof x === 'object') {
        if (x.type === 'VARIABLE_ALIAS' && typeof x.id === 'string') ids.push(x.id);
        else Object.values(x).forEach(visit);
      }
    };
    Object.values(bv ?? {}).forEach(visit);
    return ids;
  };
  for (const page of pages) {
    if (skip(page.name)) continue;
    for (const n of api.all(page)) {
      let styled = false;
      if (n.type === 'TEXT') {
        const ids =
          n.textStyleId === api.mixed
            ? (api.segments(n) ?? []).map((s) => s.textStyleId)
            : [n.textStyleId];
        const used = [...new Set(ids.filter((id) => styleById.has(id)))];
        styled = used.length > 0;
        for (const id of used)
          hits.push({
            page: page.name,
            id: n.id,
            name: n.name,
            kind: 'textStyle',
            target: styleById.get(id),
          });
      }
      // A deprecated style binds its own variables: report the style, not them again.
      if (styled) continue;
      for (const id of [...new Set(boundIds(n.boundVariables))])
        if (varById.has(id))
          hits.push({
            page: page.name,
            id: n.id,
            name: n.name,
            kind: 'variable',
            target: varById.get(id),
          });
    }
  }
  return hits;
}

/** The read-only use_figma audit (figma/reads/deprecated-usage.js). */
export function deprecatedUsageScript(targets) {
  return `// Read-only use_figma audit (hds#483), generated by scripts/figma-deprecated-usage.mjs. Do not edit.
// Save its JSON result, then: pnpm figma:deprecated-usage --ingest <file>
${hdsAuditDeprecatedUsage.toString()}
const TARGETS = ${JSON.stringify({ styles: targets.styles, variables: targets.variables.map(({ id, name }) => ({ id, name })) })};
const pages = [];
for (const page of figma.root.children) { await page.loadAsync(); pages.push(page); }
const hits = hdsAuditDeprecatedUsage(pages, TARGETS, {
  mixed: figma.mixed,
  segments: (n) => (n.characters.length ? n.getStyledTextSegments(['textStyleId']) : []),
  all: (page) => page.findAll(() => true),
});
return { fileKey: figma.fileKey, takenAt: new Date().toISOString(), styles: TARGETS.styles.map((s) => s.name).sort(), variables: TARGETS.variables.length, pages: pages.map((p) => p.name), hits };
`;
}
