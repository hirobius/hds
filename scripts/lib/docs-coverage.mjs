/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * docs-coverage — joins three lists per component (hds#762): its docs page
 * (docs-routing), its live demo (DEMOS ∩ PREVIEWED_COMPONENTS) and its Figma
 * link (the manifest's figmaUrl, from the @figma tag), which the page shows in
 * its header (generate-docs-components writes it as the `figma` frontmatter
 * PageLinks renders). Pure: callers pass the lists, so tests need no filesystem.
 */

/** @typedef {'no-page' | 'no-demo' | 'no-figma-link'} GapKind */

/**
 * The components the gate measures. Hidden and docExempt components are out
 * (the same rule as the docs gate in audit-component-integrity). A component
 * without a page of its own whose source file has a paged component is a part
 * of that one (TabsList on the Tabs page, CardHeader on the Card page), so it
 * is covered there and is not a unit.
 *
 * @param {Record<string, { filePath?: string, hidden?: boolean, docExempt?: boolean }>} specs
 * @param {(name: string) => boolean} hasPage
 * @returns {{ units: string[], parts: string[] }}
 */
export function coverageUnits(specs, hasPage) {
  const measured = Object.entries(specs ?? {}).filter(([, s]) => !s?.hidden && !s?.docExempt);
  const pagedFiles = new Set(
    measured.filter(([name, s]) => s?.filePath && hasPage(name)).map(([, s]) => s.filePath),
  );
  const units = [];
  const parts = [];
  for (const [name, spec] of measured) {
    if (!hasPage(name) && spec?.filePath && pagedFiles.has(spec.filePath)) parts.push(name);
    else units.push(name);
  }
  return { units, parts };
}

/**
 * @param {{ units: string[],
 *           pageFor: (n: string) => { path: string, shared: boolean } | null,
 *           demos: Set<string>,
 *           figmaFor: (n: string) => string | null | undefined }} input
 *   pageFor: the component's docs page; `shared` when several components share
 *   it (the utilities page, the providers guide), so its header has no Figma
 *   slot for one of them.
 * @returns {{ name: string, gap: GapKind }[]}
 */
export function findCoverageGaps({ units, pageFor, demos, figmaFor }) {
  const gaps = [];
  for (const name of units) {
    const page = pageFor(name);
    if (!page) gaps.push({ name, gap: 'no-page' });
    if (!demos.has(name)) gaps.push({ name, gap: 'no-demo' });
    if (!figmaFor(name) || !page || page.shared) gaps.push({ name, gap: 'no-figma-link' });
  }
  return gaps;
}

/**
 * Ratchet: the baseline may only shrink. A gap not in it is new; a baseline
 * entry that is no longer a gap is stale and must be removed.
 *
 * @param {{ name: string, gap: string }[]} gaps
 * @param {string[]} baseline entries as `Name:gap`
 */
export function applyRatchet(gaps, baseline) {
  const key = (g) => `${g.name}:${g.gap}`;
  const current = new Set(gaps.map(key));
  const allowed = new Set(baseline);
  return {
    newGaps: gaps.filter((g) => !allowed.has(key(g))),
    stale: baseline.filter((e) => !current.has(e)),
  };
}
