/**
 * Seam under test: `startHereStats(stats)` and `tokenFlow(sources, path)`, the build-time
 * facts behind the Start here page. Every figure comes from public/hds-stats.json and the repo
 * files, never from the page's prose. Fields that PR #1571 adds (codeConnect, figmaParity)
 * may be missing from the stats file: the reader shows what exists and leaves the rest out.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startHereStats, tokenFlow } from '../../docs-site/lib/start-here';

const ROOT = join(__dirname, '..', '..');

const base = {
  version: '1.2.3',
  components: { publicModules: 9, core: 5, patterns: 2 },
  tokens: { total: 120 },
  contrast: { textPairs: 30, nonTextPairs: 2 },
  consumers: { productApps: 2, tokenLevelSites: 4 },
  figmaSync: { synced: 10, total: 12, source: 'docs/sync-map.json' },
};

const get = (rows: { id: string; value: string }[], id: string) =>
  rows.find((r) => r.id === id)?.value;

describe('startHereStats', () => {
  it('reads the fields the stats file has, as worked examples', () => {
    const rows = startHereStats(base);
    expect(get(rows, 'version')).toBe('1.2.3');
    expect(get(rows, 'components')).toBe('5 core components, 2 patterns');
    expect(get(rows, 'tokens')).toBe('120');
    expect(get(rows, 'contrast')).toBe('32 pairs');
    expect(get(rows, 'figmaSync')).toBe('10 of 12');
  });

  it('leaves out codeConnect and figmaParity when the file does not have them yet', () => {
    const ids = startHereStats(base).map((r) => r.id);
    expect(ids).not.toContain('codeConnect');
    expect(ids).not.toContain('figmaParity');
  });

  it('adds them when the file has them', () => {
    const rows = startHereStats({
      ...base,
      codeConnect: { templates: 61 },
      figmaParity: { percent: 95.7, passed: 1515, total: 1582, readOn: '2026-11-15' },
    });
    expect(get(rows, 'codeConnect')).toBe('61 templates');
    expect(get(rows, 'figmaParity')).toBe('95.7% (1515 of 1582 checks)');
    expect(rows.find((r) => r.id === 'figmaParity')?.detail).toBe('Read on 2026-11-15');
  });

  it('skips a half-written field instead of printing undefined', () => {
    const rows = startHereStats({ ...base, figmaParity: { percent: 95.7 }, codeConnect: {} });
    const ids = rows.map((r) => r.id);
    expect(ids).not.toContain('figmaParity');
    expect(ids).not.toContain('codeConnect');
    expect(JSON.stringify(rows)).not.toContain('undefined');
  });

  it('skips a block that is missing altogether', () => {
    const rest: Record<string, unknown> = { ...base };
    delete rest.contrast;
    expect(startHereStats(rest).map((r) => r.id)).not.toContain('contrast');
  });
});

describe('tokenFlow', () => {
  const sources = {
    tokens: {
      semantic: {
        accent: {
          rest: {
            $value: '{primitive.color.graphite.700}',
            $extensions: {
              'com.figma.variables': {
                modes: {
                  Light: '{primitive.color.graphite.700}',
                  Dark: '{primitive.color.graphite.50}',
                },
              },
            },
          },
        },
      },
    },
    generatedCss: [
      ':root {',
      '  --semantic-accent-rest: var(--primitive-color-graphite-700);',
      '}',
      '[data-theme="dark"] {',
      '  --semantic-accent-rest: var(--primitive-color-graphite-50);',
      '}',
    ].join('\n'),
    snapshot: {
      collections: [
        {
          name: 'Hirobius/Semantic',
          variables: [{ path: 'semantic.accent.rest', name: 'accent/rest' }],
        },
      ],
    },
    components: [
      { file: 'a.tsx', text: 'nothing here' },
      { file: 'b.tsx', text: "className: 'bg-[var(--semantic-accent-rest)]'" },
    ],
  };

  it('follows one token from the source file to CSS, React and Figma', () => {
    expect(tokenFlow(sources, 'semantic.accent.rest')).toEqual({
      path: 'semantic.accent.rest',
      cssVar: '--semantic-accent-rest',
      light: '{primitive.color.graphite.700}',
      dark: '{primitive.color.graphite.50}',
      cssLight: '--semantic-accent-rest: var(--primitive-color-graphite-700);',
      cssDark: '--semantic-accent-rest: var(--primitive-color-graphite-50);',
      reactFile: 'b.tsx',
      figma: 'Hirobius/Semantic: accent/rest',
    });
  });

  it('throws when the token is not in the source file, so the build fails loudly', () => {
    expect(() => tokenFlow(sources, 'semantic.accent.nope')).toThrow(/semantic\.accent\.nope/);
  });

  it('holds for the real repo files: the example token is where the page says it is', () => {
    const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
    const flow = tokenFlow(
      {
        tokens: JSON.parse(read('hirobius.tokens.json')),
        generatedCss: read('src/styles/tokens.generated.css'),
        snapshot: JSON.parse(read('figma/snapshot.json')),
        components: [
          {
            file: 'segmented-control.tsx',
            text: read('src/app/components/segmented-control.tsx'),
          },
        ],
      },
      'semantic.accent.rest',
    );
    expect(flow.cssLight).toMatch(/^--semantic-accent-rest: var\(--primitive-color-/);
    expect(flow.cssDark).toMatch(/^--semantic-accent-rest: var\(--primitive-color-/);
    expect(flow.figma).toBe('Hirobius/Semantic: accent/rest');
    expect(flow.reactFile).toBe('segmented-control.tsx');
  });
});

describe('the Start here page', () => {
  const page = readFileSync(join(ROOT, 'content', 'docs', 'start-here.mdx'), 'utf8');
  const meta = JSON.parse(readFileSync(join(ROOT, 'content', 'docs', 'meta.json'), 'utf8')) as {
    pages: string[];
  };

  it('renders its stats and token flow from the repo, through components', () => {
    expect(page).toMatch(/<StartHereFlow \/>/);
    expect(page).toMatch(/<StartHereStats \/>/);
  });

  it('holds no hand-typed counts', () => {
    const prose = page.replace(/```[\s\S]*?```/g, '');
    expect(prose).not.toMatch(/\b\d{2,}\s+(components|tokens|pairs|templates|checks|gates)\b/i);
  });

  it('sits at the top of the docs nav, right after the Overview', () => {
    expect(meta.pages.slice(0, 2)).toEqual(['index', 'start-here']);
  });
});
