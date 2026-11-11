import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  specSheetModel,
  specSheetScript,
  tokenPathForCssVar,
  tokensInSource,
  tokenValue,
} from '../lib/figma-spec-sheet.mjs';
import { auditScript, normaliseAudit, specCoverage } from '../lib/figma-spec-coverage.mjs';

const tokens = {
  semantic: {
    color: {
      surface: {
        sunken: {
          $value: '{p.grey}',
          $extensions: { 'com.figma.variables': { modes: { Light: '{p.grey}', Dark: '{p.ink}' } } },
        },
      },
    },
    typography: {
      caption: {
        $value: { fontSize: { value: 14, unit: 'px' }, lineHeight: 1.5, fontWeight: 400 },
      },
    },
    space: { scaleXs: { $value: { value: 4, unit: 'px' } } },
  },
  p: { grey: { $value: '#ccc' }, ink: { $value: '#333' } },
};
const manifest = {
  docs: 'https://docs.example/',
  componentSpecs: {
    AvatarGroup: {
      filePath: 'src/app/components/avatar-group.tsx',
      description: 'Overlapping avatars.',
      figmaUrl: 'https://www.figma.com/design/K/HDS?node-id=2030-63',
      docsPage: '/docs/components/avatar-group',
      props: {
        children: { type: 'ReactNode' },
        size: { type: 'enum', values: ['sm', 'md'], optional: true },
      },
      a11yRules: Array.from({ length: 8 }, (_, i) => ({ rule: `Rule ${i + 1}.` })),
    },
    Old: { deprecated: 'Use Card.', figmaUrl: '' },
    TabsTrigger: { figmaUrl: 'https://www.figma.com/design/K/HDS?node-id=86-52' },
  },
};
const source =
  'bg-[var(--semantic-color-surface-sunken)] hds-type-caption -ml-[var(--semantic-space-scale-xs)] var(--not-a-token)';

describe('figma-spec-sheet model', () => {
  it('maps CSS variables (camelCase keys too) and type roles to token paths', () => {
    expect(tokenPathForCssVar(tokens, '--semantic-space-scale-xs')).toBe('semantic.space.scaleXs');
    expect(tokensInSource(tokens, source)).toEqual([
      'semantic.color.surface.sunken',
      'semantic.space.scaleXs',
      'semantic.typography.caption',
    ]);
  });
  it('resolves moded colours and type composites to one line', () => {
    expect(tokenValue(tokens, 'semantic.color.surface.sunken')).toBe('Light #ccc · Dark #333');
    expect(tokenValue(tokens, 'semantic.typography.caption')).toBe('14px / 1.5 / 400');
  });
  it('builds every section from code', () => {
    const m = specSheetModel('AvatarGroup', { manifest, tokens, source });
    expect(m.figmaNodeId).toBe('2030:63');
    expect(m.docsUrl).toBe('docs.example/docs/components/avatar-group');
    const by = Object.fromEntries(m.sections.map((s) => [s.title, s]));
    expect(by.Props.rows).toEqual([
      ['children', 'ReactNode', '—', 'required'],
      ['size', 'enum', 'sm | md', '—'],
    ]);
    expect(by['Variants, sizes and states'].rows).toEqual([['size', 'sm, md']]);
    expect(by['Tokens used'].rows[0]).toEqual([
      'semantic.color.surface.sunken',
      'Light #ccc · Dark #333',
    ]);
    // The kit's Bullets part holds six items: the sixth points at the docs.
    expect(by.Accessibility.bullets).toHaveLength(6);
    expect(by.Accessibility.bullets[5]).toBe(
      '3 more on docs.example/docs/components/avatar-group.',
    );
    expect(by.Usage.bullets).toEqual(['Overlapping avatars.']);
  });
  it('marks deprecated tokens instead of printing their value', () => {
    const m = specSheetModel('AvatarGroup', {
      manifest,
      tokens,
      source,
      deprecations: {
        tokens: [{ path: 'semantic.typography.caption', replacement: 'semantic.typography.ui' }],
      },
    });
    const rows = m.sections.find((s) => s.title === 'Tokens used').rows;
    expect(rows).toContainEqual([
      'semantic.typography.caption',
      'deprecated, use semantic.typography.ui',
    ]);
  });
  it('throws for a component the manifest does not know', () => {
    expect(() => specSheetModel('Nope', { manifest, tokens })).toThrow(
      /not in public\/hds-manifest.json/,
    );
  });
  it('emits a use_figma script that parses, embeds the text fit and never publishes', () => {
    const script = specSheetScript([
      { pageId: '2030:2', model: specSheetModel('AvatarGroup', { manifest, tokens, source }) },
    ]);
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    expect(() => new AsyncFunction('figma', script)).not.toThrow();
    expect(script).toContain('function hdsFitDocText');
    expect(script).not.toMatch(/publish|loadAllPagesAsync|setPluginData/);
  });
  it('the repo AvatarGroup model reads real code', async () => {
    const { modelFor } = await import('../figma-spec-sheets.mjs');
    const m = modelFor('AvatarGroup');
    expect(m.sections.map((s) => s.title)).toContain('Tokens used');
    expect(readFileSync(new URL('../../' + m.codePath, import.meta.url), 'utf8')).toContain(
      'AvatarGroup',
    );
  });
});

describe('figma-spec-coverage', () => {
  const disposition = {
    components: [
      { name: 'AvatarGroup', class: 'library' },
      { name: 'TabsTrigger', class: 'library' },
      { name: 'Old', class: 'library' },
      { name: 'Box', class: 'layout' },
    ],
  };
  const page = (name, sheets, nodes) => ({
    id: name,
    name,
    sheets: sheets.map((s) => ({ id: s, name: s })),
    nodes,
  });
  it('covers by own sheet or by a sheet on the page holding the node; deprecated is exempt', () => {
    const audit = {
      pages: [
        page('AvatarGroup', ['AvatarGroup — spec sheet'], ['2030:63']),
        page('Tabs', ['Tabs — spec sheet'], ['86:52']),
      ],
    };
    const r = specCoverage(audit, manifest, disposition);
    expect(r.missing).toEqual([]);
    expect(r.covered.map((c) => c.name)).toEqual(['AvatarGroup', 'TabsTrigger']);
    expect(r.exempt).toEqual([{ name: 'Old', reason: 'deprecated' }]);
  });
  it('reports a library component with no sheet', () => {
    const r = specCoverage(
      { pages: [page('AvatarGroup', [], ['2030:63'])] },
      manifest,
      disposition,
    );
    expect(r.missing.map((m) => m.name)).toEqual(['AvatarGroup', 'TabsTrigger']);
    expect(r.missing[0].page).toBe('AvatarGroup');
  });
  it('normalises the audit deterministically and the audit script parses', () => {
    const a = normaliseAudit(
      { fileKey: 'K', pages: [page('B', [], ['2', '1']), page('A', [], [])] },
      '2026-11-11',
    );
    expect(a.pages.map((p) => p.name)).toEqual(['A', 'B']);
    expect(a.pages[1].nodes).toEqual(['1', '2']);
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    expect(() => new AsyncFunction('figma', auditScript())).not.toThrow();
  });
});

describe('figma-spec-coverage overrides', () => {
  it('finds a tagless part through figma/mapping-overrides.json', () => {
    const disposition = { components: [{ name: 'SheetTrigger', class: 'library' }] };
    const audit = {
      pages: [
        {
          id: 's',
          name: 'Sheet',
          sheets: [{ id: '1', name: 'Sheet — spec sheet' }],
          nodes: ['2265:3'],
        },
      ],
    };
    const overrides = {
      overrides: [{ nodeId: '2265:3', name: 'SheetTrigger', mapsTo: 'Sheet.Trigger' }],
    };
    expect(specCoverage(audit, { componentSpecs: {} }, disposition).missing).toHaveLength(1);
    expect(specCoverage(audit, { componentSpecs: {} }, disposition, overrides).covered).toEqual([
      { name: 'SheetTrigger', via: 'Sheet page sheet' },
    ]);
  });
});
