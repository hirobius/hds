/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * sync-map — one row per component, joining every record that describes it.
 *
 * Four records describe a component and none of them referenced the others:
 * the source file, the manifest entry, the Storybook story, and the Figma node.
 * Answering "is Table in sync, and where do I edit it" meant reading
 * hds-manifest.json, figma-disposition's classification, figma/mapping
 * overrides and a glob of *.stories.tsx, then holding the join in your head.
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
  NO_STORY: 'no-story',
  NO_FIGMA: 'no-figma-node',
  HAS_DEFECTS: 'rendered-defects',
});

const GAP_ORDER = [
  GAPS.NO_SOURCE,
  GAPS.NOT_IN_MANIFEST,
  GAPS.NO_STORY,
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
 * @param defectsByStory {storyId -> finding count}
 * @param orphanStories  [{ storyFile, reason }] story files that resolve to no
 *                       component -- reported, never silently dropped
 */
export function buildSyncMap({
  specs,
  disposition,
  figmaMapped = new Set(),
  sourceFiles = new Set(),
  defectsByStory = {},
  orphanStories = [],
}) {
  const rows = Object.entries(specs)
    .map(([name, spec]) => {
      const klass = disposition[name] ?? 'internal';
      // Only the library tier is meant to exist in Figma. A layout primitive
      // renders no pixels and a slot is modelled inside its parent, so calling
      // either "missing a node" would manufacture 32 false gaps.
      const expectFigma = klass === 'library';
      const hasFigma = Boolean(spec.figmaUrl) || figmaMapped.has(name);
      const storyIds = spec.storyIds ?? [];
      // An internal component is not a consumer-facing surface, so a missing
      // story there is a choice rather than a gap.
      const expectStory = klass !== 'internal';

      const defects = storyIds.reduce((sum, id) => sum + (defectsByStory[id] ?? 0), 0);

      const gaps = [];
      if (!spec.filePath || !sourceFiles.has(spec.filePath)) gaps.push(GAPS.NO_SOURCE);
      if (expectStory && storyIds.length === 0) gaps.push(GAPS.NO_STORY);
      if (expectFigma && !hasFigma) gaps.push(GAPS.NO_FIGMA);
      if (defects > 0) gaps.push(GAPS.HAS_DEFECTS);

      return {
        name,
        class: klass,
        filePath: spec.filePath ?? null,
        storyFiles: spec.storyFiles ?? [],
        storyIds,
        storyCount: storyIds.length,
        figmaUrl: spec.figmaUrl ?? null,
        figmaVia: spec.figmaUrl ? 'manifest' : figmaMapped.has(name) ? 'mapping-override' : null,
        expectFigma,
        expectStory,
        defects,
        gaps,
        synced: gaps.length === 0,
      };
    })
    .sort((a, b) => {
      const rank = (r) => (r.gaps.length ? GAP_ORDER.indexOf(r.gaps[0]) : GAP_ORDER.length);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  return {
    rows,
    orphanStories: [...orphanStories].sort((a, b) => a.storyFile.localeCompare(b.storyFile)),
  };
}

/** Counts the report leads with, and the gate compares against a baseline. */
export function summarizeSyncMap({ rows, orphanStories }) {
  const byGap = {};
  for (const row of rows) for (const gap of row.gaps) byGap[gap] = (byGap[gap] ?? 0) + 1;
  const byClass = {};
  for (const row of rows) byClass[row.class] = (byClass[row.class] ?? 0) + 1;
  return {
    components: rows.length,
    synced: rows.filter((r) => r.synced).length,
    byGap,
    byClass,
    orphanStories: orphanStories.length,
    // The two axes worth quoting on their own, because they are the ones the
    // roadmap tracks.
    storyCoverage: {
      expected: rows.filter((r) => r.expectStory).length,
      covered: rows.filter((r) => r.expectStory && r.storyCount > 0).length,
    },
    figmaCoverage: {
      expected: rows.filter((r) => r.expectFigma).length,
      covered: rows.filter((r) => r.expectFigma && r.figmaVia).length,
    },
  };
}
