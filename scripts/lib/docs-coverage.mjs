/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * docs-coverage — joins three lists per documented component (hds#762):
 * a docs page (docs-routing), a live demo (DEMOS + PREVIEWED_COMPONENTS) and a
 * Figma link (manifest componentSpecs[].figmaUrl, from the @figma tag).
 * Pure: callers pass the lists, so tests need no filesystem.
 */

/**
 * @param {{ components: string[], pageFor: (n: string) => string | null,
 *           demos: Set<string>, figmaFor: (n: string) => string | null | undefined }} input
 * @returns {{ name: string, gap: 'no-page' | 'no-demo' | 'no-figma-link' }[]}
 */
export function findCoverageGaps({ components, pageFor, demos, figmaFor }) {
  const gaps = [];
  for (const name of components) {
    if (!pageFor(name)) gaps.push({ name, gap: 'no-page' });
    if (!demos.has(name)) gaps.push({ name, gap: 'no-demo' });
    if (!figmaFor(name)) gaps.push({ name, gap: 'no-figma-link' });
  }
  return gaps;
}

/**
 * Ratchet: the allowlist may only shrink. A gap not in it is new; an allowlist
 * entry that is no longer a gap is stale and must be removed.
 *
 * @param {{ name: string, gap: string }[]} gaps
 * @param {string[]} allowlist entries as `Name:gap`
 */
export function applyRatchet(gaps, allowlist) {
  const key = (g) => `${g.name}:${g.gap}`;
  const current = new Set(gaps.map(key));
  const allowed = new Set(allowlist);
  return {
    newGaps: gaps.filter((g) => !allowed.has(key(g))),
    stale: allowlist.filter((e) => !current.has(e)),
  };
}
