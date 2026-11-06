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
 * The components the gate measures. Hidden components are out, and so are
 * deprecated ones: the deprecation guide documents those, never a live page
 * (content-model Rule 4, hds#1227). A docExempt
 * component is out only when it has no page: `@doc-exempt` is a file-level tag
 * and some are stale (Dialog, Menu have pages), so a paged one is measured. A component
 * without a page of its own whose source file has a paged component is a part
 * of that one (TabsList on the Tabs page, CardHeader on the Card page), so it
 * is covered there and is not a unit.
 *
 * @param {Record<string, { filePath?: string, hidden?: boolean, docExempt?: boolean, deprecated?: string }>} specs
 * @param {(name: string) => boolean} hasPage
 * @returns {{ units: string[], parts: string[] }}
 */
export function coverageUnits(specs, hasPage) {
  const measured = Object.entries(specs ?? {}).filter(
    ([name, s]) => !s?.hidden && !s?.deprecated && (!s?.docExempt || hasPage(name)),
  );
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
 *   it (the utilities page, the providers guide). A shared page's header has no
 *   Figma slot for one of them, so no Figma link is asked of it (a gap there
 *   could never be filled, and the baseline must be able to reach zero).
 *   figmaFor: the component's Figma URL, or null when it has none (or no valid one).
 * @returns {{ name: string, gap: GapKind }[]}
 */
export function findCoverageGaps({ units, pageFor, demos, figmaFor }) {
  const gaps = [];
  for (const name of units) {
    const page = pageFor(name);
    if (!page) gaps.push({ name, gap: 'no-page' });
    if (!demos.has(name)) gaps.push({ name, gap: 'no-demo' });
    if (page?.shared) continue;
    if (!figmaFor(name)) gaps.push({ name, gap: 'no-figma-link' });
  }
  return gaps;
}

/**
 * The pageFor that findCoverageGaps takes: a component's docs page, `shared`
 * when it is the page the providers or the utilities share (the providers
 * guide, the utilities page).
 *
 * @param {{ providers: string[], utilities: string[] }} routing  loadDocsRouting's result
 * @param {(name: string, routing: any) => string | null} pagePath  docsPagePath
 * @returns {(name: string) => { path: string, shared: boolean } | null}
 */
export function pageLookup(routing, pagePath) {
  const sharedPages = new Set(
    [...routing.providers, ...routing.utilities].map((n) => pagePath(n, routing)),
  );
  return (name) => {
    const p = pagePath(name, routing);
    return p ? { path: p, shared: sharedPages.has(p) } : null;
  };
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
