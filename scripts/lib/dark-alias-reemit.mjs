/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * dark-alias-reemit — keep aliases flipping when a theme is scoped to a subtree.
 *
 * A custom property is substituted on the element where it is DECLARED, using
 * that element's computed value of whatever it references. So
 *
 *   :root                { --role-border: var(--semantic-color-border-default); }
 *   [data-theme="dark"]  { --semantic-color-border-default: <dark>; }
 *
 * computes `--role-border` against `:root`'s semantic value, and what inherits
 * down the tree is a finished colour, not a live reference.
 *
 * When `data-theme` is on `<html>` that is harmless: `<html>` IS `:root`, the
 * dark rule wins on the same element, and the alias computes dark. Measured in
 * Chromium against the real emitted CSS — all probes flip.
 *
 * When `data-theme` is on a DESCENDANT — a themed section, the preview stage —
 * the semantic flips at that element but the alias was already computed
 * upstream, so its LIGHT value inherits onto a dark surface. Measured: 55
 * variables stuck, across role.* and component.*.
 *
 *   data-theme on <html>        --role-border  light #e5e5e5  dark #404040  FLIPS
 *   data-theme on a descendant  --role-border  light #e5e5e5  dark #e5e5e5  STUCK
 *
 * The fix is to re-declare each theme-sensitive alias inside the dark block so
 * it re-computes wherever the attribute lands. Emitted CSS only — no token
 * changes, and no effect at all on root-level theming, which already worked.
 *
 * Why every token gate missed it: they resolve the token GRAPH in JS, where
 * the indirection is correct. The defect exists only in the emitted cascade.
 */

/** `  --name: value;` → [name, value]. Anything else → null. */
function parseDeclaration(line) {
  const m = /^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/.exec(line);
  return m ? [m[1], m[2].trim()] : null;
}

/**
 * The single variable this value is a bare alias of, or null.
 *
 * ONLY a whole-value `var(--x)` qualifies. A composite like
 * `0 1px 2px var(--shadow-color)` is substituted at use rather than copied as
 * a finished value, so it does not have this defect.
 */
function aliasTarget(value) {
  const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
  return m ? m[1] : null;
}

/**
 * Declarations to append to the dark block.
 *
 * A variable is theme-sensitive if the dark block overrides it, or if it is a
 * bare alias of something theme-sensitive — computed to a fixpoint. One hop
 * would be enough for today's token file (every affected chain is alias →
 * semantic → primitive, and every semantic is already overridden), but a
 * deeper chain added later would silently reintroduce a defect nothing else
 * catches.
 *
 * @param {string[]} rootLines  declarations emitted into `:root`
 * @param {string[]} darkLines  declarations already emitted into the dark block
 * @returns {string[]}          extra declarations, in `:root` order
 */
export function darkAliasReemissions(rootLines, darkLines) {
  const rootDecls = rootLines.map(parseDeclaration).filter(Boolean);
  const alreadyDark = new Set(
    darkLines
      .map(parseDeclaration)
      .filter(Boolean)
      .map(([n]) => n),
  );

  const sensitive = new Set(alreadyDark);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, value] of rootDecls) {
      if (sensitive.has(name)) continue;
      const target = aliasTarget(value);
      if (target && sensitive.has(target)) {
        sensitive.add(name);
        grew = true;
      }
    }
  }

  // `:root` order, so the emitted file is stable build to build.
  return rootLines.filter((line) => {
    const decl = parseDeclaration(line);
    if (!decl) return false;
    const [name, value] = decl;
    // Already in the dark block: re-emitting would duplicate it and, being
    // later, silently override a deliberate dark-specific value.
    if (alreadyDark.has(name)) return false;
    const target = aliasTarget(value);
    return Boolean(target) && sensitive.has(name);
  });
}
