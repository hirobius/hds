/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * sync-map — one row per component, joining every record that describes it.
 *
 * Four records describe a component and none of them referenced the others:
 * the source file, the manifest entry, the docs-site page, and the Figma node.
 * Answering "is Table in sync, and where do I edit it" meant reading
 * hds-manifest.json, figma-disposition's classification, figma/mapping
 * overrides and the docs content, then holding the join in your head.
 * That is the reason a defect list has to be reported from memory instead of
 * looked up.
 *
 * This module does the join and states, per component, exactly what is missing.
 * It makes no judgement about whether a gap should be filled -- `expectFigma`
 * comes from the ratified disposition rules (hds#235), so a layout primitive is
 * never reported as missing a Figma node it is not supposed to have.
 */

/** A component's sync verdict, worst first. Order is the report's sort order. */
export const GAPS = Object.freeze({
  NO_SOURCE: 'no-source-file',
  NOT_IN_MANIFEST: 'not-in-manifest',
  NO_DOCS: 'no-docs-page',
  NO_FIGMA: 'no-figma-node',
  HAS_DEFECTS: 'rendered-defects',
});

const GAP_ORDER = [
  GAPS.NO_SOURCE,
  GAPS.NOT_IN_MANIFEST,
  GAPS.NO_DOCS,
  GAPS.NO_FIGMA,
  GAPS.HAS_DEFECTS,
];

/**
 * Build the join.
 *
 * @param specs        {name -> manifest componentSpec}
 * @param disposition  {name -> 'library'|'slot'|'layout'|'internal'}
 * @param figmaMapped  Set of names linked to Figma by a mapping override
 *                     rather than by a figmaUrl on the spec
 * @param sourceFiles  Set of component source paths that exist on disk
 * @param expectDocs   Set of names that must have a docs-site page (the core
 *                     components and the patterns)
 * @param defectsByComponent {name -> rendered finding count}, measured on the
 *                     component's Storybook stories (retired with Storybook)
 */
export function buildSyncMap({
  specs,
  disposition,
  figmaMapped = new Set(),
  sourceFiles = new Set(),
  expectDocs = new Set(),
  defectsByComponent = {},
}) {
  const rows = Object.entries(specs)
    .map(([name, spec]) => {
      const klass = disposition[name] ?? 'internal';
      // Only the library tier is meant to exist in Figma. A layout primitive
      // renders no pixels and a slot is modelled inside its parent, so calling
      // either "missing a node" would manufacture 32 false gaps.
      const expectFigma = klass === 'library';
      const hasFigma = Boolean(spec.figmaUrl) || figmaMapped.has(name);
      const docsPage = spec.docsPage ?? null;
      // Only the core components and the patterns have a docs page; a
      // component outside them has none by design, not by gap.
      const expectDocsPage = expectDocs.has(name);

      const defects = defectsByComponent[name] ?? 0;

      const gaps = [];
      if (!spec.filePath || !sourceFiles.has(spec.filePath)) gaps.push(GAPS.NO_SOURCE);
      if (expectDocsPage && !docsPage) gaps.push(GAPS.NO_DOCS);
      if (expectFigma && !hasFigma) gaps.push(GAPS.NO_FIGMA);
      if (defects > 0) gaps.push(GAPS.HAS_DEFECTS);

      return {
        name,
        class: klass,
        filePath: spec.filePath ?? null,
        docsPage,
        figmaUrl: spec.figmaUrl ?? null,
        figmaVia: spec.figmaUrl ? 'manifest' : figmaMapped.has(name) ? 'mapping-override' : null,
        expectFigma,
        expectDocs: expectDocsPage,
        defects,
        gaps,
        synced: gaps.length === 0,
      };
    })
    .sort((a, b) => {
      const rank = (r) => (r.gaps.length ? GAP_ORDER.indexOf(r.gaps[0]) : GAP_ORDER.length);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  return { rows };
}

/** Counts the report leads with, and the gate compares against a baseline. */
export function summarizeSyncMap({ rows }) {
  const byGap = {};
  for (const row of rows) for (const gap of row.gaps) byGap[gap] = (byGap[gap] ?? 0) + 1;
  const byClass = {};
  for (const row of rows) byClass[row.class] = (byClass[row.class] ?? 0) + 1;
  return {
    components: rows.length,
    synced: rows.filter((r) => r.synced).length,
    byGap,
    byClass,
    // The two axes worth quoting on their own, because they are the ones the
    // roadmap tracks.
    docsCoverage: {
      expected: rows.filter((r) => r.expectDocs).length,
      covered: rows.filter((r) => r.expectDocs && r.docsPage).length,
    },
    figmaCoverage: {
      expected: rows.filter((r) => r.expectFigma).length,
      covered: rows.filter((r) => r.expectFigma && r.figmaVia).length,
    },
  };
}
