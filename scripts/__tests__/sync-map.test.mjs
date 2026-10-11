/**
 * The join's value is that it tells you where to edit, so the assertions that
 * matter are the ones about NOT manufacturing work: a layout primitive is not
 * missing a Figma node it was never supposed to have, and a component outside
 * the core set is not missing a docs page it was never going to get. A gate that invents 32 false gaps is one
 * nobody reads.
 */
import { describe, expect, it } from 'vitest';
import { GAPS, buildSyncMap, summarizeSyncMap } from '../lib/sync-map.mjs';

const spec = (over = {}) => ({
  filePath: 'src/app/components/thing.tsx',
  docsPage: '/docs/components/thing',
  figmaUrl: 'https://figma.com/design/x?node-id=1-2',
  ...over,
});

const base = {
  sourceFiles: new Set(['src/app/components/thing.tsx']),
  disposition: { Thing: 'library' },
  expectDocs: new Set(['Thing']),
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

  it('does not expect a docs page from a component outside the core set and the patterns', () => {
    const { rows } = buildSyncMap({
      ...base,
      expectDocs: new Set(),
      disposition: { Thing: 'internal' },
      specs: { Thing: spec({ figmaUrl: null, docsPage: null }) },
    });
    expect(rows[0]).toMatchObject({ expectDocs: false, docsPage: null, synced: true });
  });

  it('flags a core component whose manifest entry lost its docs page', () => {
    const { rows } = buildSyncMap({ ...base, specs: { Thing: spec({ docsPage: null }) } });
    expect(rows[0].gaps).toEqual([GAPS.NO_DOCS]);
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

  it('attributes rendered defects to the component by name', () => {
    const { rows } = buildSyncMap({
      ...base,
      specs: { Thing: spec() },
      defectsByComponent: { Thing: 3, Other: 9 },
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
});

describe('summarizeSyncMap', () => {
  it('counts coverage against what is expected, not against every component', () => {
    const map = buildSyncMap({
      sourceFiles: new Set(['src/app/components/thing.tsx']),
      disposition: { Lib: 'library', Layout: 'layout', Internal: 'internal' },
      expectDocs: new Set(['Lib', 'Layout']),
      specs: {
        Lib: spec(),
        Layout: spec({ figmaUrl: null }),
        Internal: spec({ figmaUrl: null, docsPage: null }),
      },
    });
    const summary = summarizeSyncMap(map);
    expect(summary.figmaCoverage).toEqual({ expected: 1, covered: 1 });
    expect(summary.docsCoverage).toEqual({ expected: 2, covered: 2 });
    expect(summary.synced).toBe(3);
  });
});
