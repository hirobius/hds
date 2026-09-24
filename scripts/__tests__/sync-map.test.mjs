/**
 * The join's value is that it tells you where to edit, so the assertions that
 * matter are the ones about NOT manufacturing work: a layout primitive is not
 * missing a Figma node it was never supposed to have, and an internal component
 * is not missing a story nobody wants. A gate that invents 32 false gaps is one
 * nobody reads.
 */
import { describe, expect, it } from 'vitest';
import { GAPS, buildSyncMap, summarizeSyncMap } from '../lib/sync-map.mjs';

const spec = (over = {}) => ({
  filePath: 'src/app/components/thing.tsx',
  storyFiles: ['src/stories/thing.stories.tsx'],
  storyIds: ['primitives-thing--default'],
  figmaUrl: 'https://figma.com/design/x?node-id=1-2',
  ...over,
});

const base = {
  sourceFiles: new Set(['src/app/components/thing.tsx']),
  disposition: { Thing: 'library' },
};

describe('buildSyncMap', () => {
  it('reports a fully joined library component as synced', () => {
    const { rows } = buildSyncMap({ ...base, specs: { Thing: spec() } });
    expect(rows[0]).toMatchObject({ name: 'Thing', synced: true, gaps: [], figmaVia: 'manifest' });
  });

  it('does not expect a Figma node from a layout primitive', () => {
    // A layout primitive renders no pixels; Figma models it as auto-layout, not
    // a component. Calling it "missing a node" manufactures a gap.
    const { rows } = buildSyncMap({
      ...base,
      disposition: { Thing: 'layout' },
      specs: { Thing: spec({ figmaUrl: null }) },
    });
    expect(rows[0]).toMatchObject({ expectFigma: false, synced: true });
  });

  it('does not expect a Figma node from a slot member', () => {
    const { rows } = buildSyncMap({
      ...base,
      disposition: { Thing: 'slot' },
      specs: { Thing: spec({ figmaUrl: null }) },
    });
    expect(rows[0].gaps).not.toContain(GAPS.NO_FIGMA);
  });

  it('does not expect a story from an internal component', () => {
    const { rows } = buildSyncMap({
      ...base,
      disposition: { Thing: 'internal' },
      specs: { Thing: spec({ figmaUrl: null, storyIds: [], storyFiles: [] }) },
    });
    expect(rows[0]).toMatchObject({ expectStory: false, synced: true });
  });

  it('flags a library component with no Figma node', () => {
    const { rows } = buildSyncMap({ ...base, specs: { Thing: spec({ figmaUrl: null }) } });
    expect(rows[0].gaps).toEqual([GAPS.NO_FIGMA]);
  });

  it('counts a mapping override as linked, not missing', () => {
    // 3 of the 47 linked components are linked by figma/disposition.json's
    // overrides rather than by a figmaUrl on the spec. Reading only the
    // manifest reports 44 and three false gaps.
    const { rows } = buildSyncMap({
      ...base,
      specs: { Thing: spec({ figmaUrl: null }) },
      figmaMapped: new Set(['Thing']),
    });
    expect(rows[0]).toMatchObject({ figmaVia: 'mapping-override', synced: true });
  });

  it('flags a component whose declared source is not on disk', () => {
    const { rows } = buildSyncMap({ ...base, sourceFiles: new Set(), specs: { Thing: spec() } });
    expect(rows[0].gaps).toContain(GAPS.NO_SOURCE);
  });

  it('accepts a source file outside src/', () => {
    // The seven Compiler primitives declare scripts/hds-jsx-compiler.mjs,
    // because that is genuinely where they are defined.
    const { rows } = buildSyncMap({
      ...base,
      sourceFiles: new Set(['scripts/hds-jsx-compiler.mjs']),
      specs: { Thing: spec({ filePath: 'scripts/hds-jsx-compiler.mjs' }) },
    });
    expect(rows[0].gaps).not.toContain(GAPS.NO_SOURCE);
  });

  it('attributes rendered defects to the component through its story ids', () => {
    const { rows } = buildSyncMap({
      ...base,
      specs: { Thing: spec() },
      defectsByStory: { 'primitives-thing--default': 3, 'other--story': 9 },
    });
    expect(rows[0]).toMatchObject({ defects: 3, gaps: [GAPS.HAS_DEFECTS] });
  });

  it('sorts the worst gap first and breaks ties by name', () => {
    const { rows } = buildSyncMap({
      ...base,
      disposition: { Fine: 'library', Broken: 'library', Also: 'library' },
      specs: {
        Fine: spec(),
        Broken: spec({ filePath: 'gone.tsx' }),
        Also: spec({ figmaUrl: null }),
      },
    });
    expect(rows.map((r) => r.name)).toEqual(['Broken', 'Also', 'Fine']);
  });

  it('keeps an unresolved story file rather than dropping it', () => {
    const { orphanStories } = buildSyncMap({
      ...base,
      specs: {},
      orphanStories: [{ storyFile: 'b.stories.tsx' }, { storyFile: 'a.stories.tsx' }],
    });
    expect(orphanStories.map((o) => o.storyFile)).toEqual(['a.stories.tsx', 'b.stories.tsx']);
  });
});

describe('summarizeSyncMap', () => {
  it('counts coverage against what is expected, not against every component', () => {
    const map = buildSyncMap({
      sourceFiles: new Set(['src/app/components/thing.tsx']),
      disposition: { Lib: 'library', Layout: 'layout', Internal: 'internal' },
      specs: {
        Lib: spec(),
        Layout: spec({ figmaUrl: null }),
        Internal: spec({ figmaUrl: null, storyIds: [], storyFiles: [] }),
      },
    });
    const summary = summarizeSyncMap(map);
    expect(summary.figmaCoverage).toEqual({ expected: 1, covered: 1 });
    expect(summary.storyCoverage).toEqual({ expected: 2, covered: 2 });
    expect(summary.synced).toBe(3);
  });
});
