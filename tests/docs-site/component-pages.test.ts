/**
 * Seam under test: `buildComponentPages({ manifest, api, core })` — the
 * generator behind content/docs/components/*.mdx (hds#506, hds#493). Pages are
 * generated from component-api.json (props) and the manifest (usage contract,
 * keyboard, a11y), never hand-written, so adding a core component needs no
 * hand-editing. Expected strings below are worked examples, not recomputed.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import {
  buildComponentPages,
  componentSlug,
  pageDescription,
  patternComponents,
  readerText,
} from '../../scripts/lib/docs-component-pages.mjs';
// @ts-expect-error — plain .mjs module, no types
import { CORE_COMPONENTS } from '../../scripts/lib/core-components.mjs';
import { PREVIEWED_COMPONENTS } from '../../docs-site/lib/previewed-components';

const ROOT = join(__dirname, '..', '..');
const PROVIDERS = ['HdsRouterProvider', 'HdsThemeProvider', 'ToastProvider'];
const UTILITIES = ['Box', 'Container', 'VisuallyHidden'];

const fixtureManifest = {
  componentSpecs: {
    Widget: {
      description: 'A widget.',
      since: '0.3.0',
      usage: {
        when: 'Show a {widget} for <b> | pipes.',
        whenNot: 'Show a gadget.',
        useInstead: [{ component: 'Gadget', reason: 'gadgets' }],
      },
      keyboard: [{ keys: 'Enter/Space', effect: 'Activates the widget.' }],
      a11yRules: [{ rule: 'Needs a name', required: true }],
      tokenMapping: { 'Corner radius': 'primitive.radius.4' },
    },
  },
};
const fixtureApi = {
  components: {
    Widget: {
      props: [
        {
          name: 'size',
          type: "'sm' | 'md'",
          default: "'md'",
          required: false,
          description: 'Widget size.',
        },
        { name: 'label', type: 'string', required: true, description: '' },
      ],
    },
  },
};

describe('buildComponentPages (fixture)', () => {
  const pages = buildComponentPages({
    manifest: fixtureManifest,
    api: fixtureApi,
    core: ['Widget'],
    providers: [],
  });
  const page = pages.get('widget') as string;

  it('emits one page per core component, slugged kebab-case', () => {
    expect([...pages.keys()]).toEqual(['widget']);
    expect(componentSlug('SegmentedControl')).toBe('segmented-control');
    expect(componentSlug('Kbd')).toBe('kbd');
  });

  it('has frontmatter but no body H1 (the layout renders the title)', () => {
    expect(page.startsWith('---\ntitle: "Widget"\n')).toBe(true);
    expect(page).toContain('component: "Widget"');
    expect(page).not.toMatch(/^# /m);
  });

  it('carries the content-model markers', () => {
    expect(page).toContain('{/* preview: Widget */}');
    expect(page).toContain('{/* props: Widget */}');
    expect(page).toContain('{/* generated: tokens */}');
  });

  it('renders the props table from component-api rows', () => {
    expect(page).toContain('| Prop | Type | Default | Description |');
    expect(page).toContain("| `size` | `'sm' \\| 'md'` | `'md'` | Widget size. |");
    expect(page).toContain('| `label` (required) | `string` | — | — |');
  });

  it('renders the usage contract and keyboard table', () => {
    expect(page).toContain('- Show a \\{widget\\} for \\<b> | pipes.');
    expect(page).toContain('- Not for show a gadget.');
    // Gadget is not a core component here, so there is no page to link to.
    expect(page).toContain('- For gadgets, use `Gadget`.');
    expect(page).toContain('| `Enter/Space` | Activates the widget. |');
    expect(page).toContain('Needs a name');
  });

  it('escapes MDX-significant characters in prose', () => {
    expect(page).toContain('- Show a \\{widget\\} for \\<b> | pipes.');
  });

  it('marks a missing props source instead of inventing props', () => {
    const p = buildComponentPages({
      manifest: fixtureManifest,
      api: { components: {} },
      core: ['Widget'],
      providers: [],
    }).get('widget') as string;
    expect(p).toContain('{/* props: TODO — source missing */}');
    expect(p).not.toContain('{/* props: Widget */}');
  });
});

describe('drift: every core component has a generated page', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'public/hds-manifest.json'), 'utf8'));
  let api: unknown;
  beforeAll(() => {
    // component-api.json is generated and gitignored; build it when absent.
    if (!existsSync(join(ROOT, 'src/app/data/component-api.json'))) {
      execFileSync('node', ['scripts/generate-component-api.mjs'], { cwd: ROOT, stdio: 'ignore' });
    }
    api = JSON.parse(readFileSync(join(ROOT, 'src/app/data/component-api.json'), 'utf8'));
  });

  it('covers CORE_COMPONENTS: one page each, utilities on one shared page', () => {
    const pages = buildComponentPages({
      manifest,
      api,
      core: CORE_COMPONENTS,
      providers: PROVIDERS,
      utilities: UTILITIES,
    });
    const expected = [
      ...(CORE_COMPONENTS as string[])
        .filter((n) => !PROVIDERS.includes(n) && !UTILITIES.includes(n))
        .map(componentSlug),
      'utilities',
    ].sort();
    expect([...pages.keys()].sort()).toEqual(expected);
    expect(expected).toHaveLength(38);
    const utilities = (pages as Map<string, string>).get('utilities')!;
    for (const n of UTILITIES) {
      expect(utilities).toContain(`## ${n}`);
      expect(utilities).toContain(`{/* preview: ${n} */}`);
    }
  });

  it('generated output passes scripts/check-docs.mjs (membership, markers, frontmatter)', () => {
    const pages = buildComponentPages({
      manifest,
      api,
      core: CORE_COMPONENTS,
      providers: PROVIDERS,
      utilities: UTILITIES,
    });
    const root = mkdtempSync(join(tmpdir(), 'hds-docs-'));
    mkdirSync(join(root, 'content/docs/components'), { recursive: true });
    mkdirSync(join(root, 'content/docs/guides'), { recursive: true });
    writeFileSync(
      join(root, 'content/docs/guides/providers.mdx'),
      '---\ntitle: "Providers"\ndescription: "Providers."\nstatus: "stable"\n---\n',
    );
    for (const [slug, mdx] of pages as Map<string, string>) {
      writeFileSync(join(root, 'content/docs/components', `${slug}.mdx`), mdx);
    }
    expect(readdirSync(join(root, 'content/docs/components'))).toHaveLength(38);
    expect(() =>
      execFileSync('node', ['scripts/check-docs.mjs', '--root', root], {
        cwd: ROOT,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });

  it('has a live preview for the starter set, all of them core', () => {
    for (const n of ['Button', 'Input', 'Select', 'Checkbox', 'Dialog', 'Menu', 'Table']) {
      expect(PREVIEWED_COMPONENTS).toContain(n);
    }
    expect(PREVIEWED_COMPONENTS).toContain('MetricTiles');
  });
});

describe('pageDescription: a reader-facing summary, not a code note', () => {
  const when = 'Group related content on a raised surface.';

  it('keeps only the first sentence and capitalises it', () => {
    expect(
      pageDescription('Grid', {
        description: 'responsive grid primitive. Enforces semantic gap. - layout=fixed',
      }),
    ).toBe('Responsive grid primitive.');
    expect(
      pageDescription('Box', { description: 'layout primitive. sx is a subset of MUI.' }),
    ).toBe('Layout primitive.');
  });

  it('strips a leading component-name prefix, whatever the separator', () => {
    expect(
      pageDescription('InlineLink', { description: 'InlineLink \u201d inline link primitive.' }),
    ).toBe('Inline link primitive.');
    expect(pageDescription('Seg', { description: 'Seg " segmented input. More detail.' })).toBe(
      'Segmented input.',
    );
  });

  it('falls back to usage.when for internal notes (Figma tagging, root + parts)', () => {
    for (const description of [
      'Tagged per-export, not on the file block: this module exports eight components.',
      'Menu root + parts. Controlled via open.',
      'Tooltip root. Bakes in the Radix Provider.',
      'The tab set itself. Tagged here rather than in the file block.',
    ]) {
      expect(pageDescription('X', { description, usage: { when } })).toBe(when);
    }
  });

  it('does not split on e.g., and drops JSX tags a subtitle would print raw', () => {
    expect(pageDescription('Kbd', { description: 'Renders a key, e.g. <Kbd>K</Kbd>.' })).toBe(
      'Renders a key, e.g. K.',
    );
  });

  it('drops implementation asides', () => {
    expect(
      pageDescription('VisuallyHidden', {
        description: 'Renders its children off-screen (Tailwind sr-only) for screen readers.',
      }),
    ).toBe('Renders its children off-screen for screen readers.');
  });

  it('uses a default when there is nothing to say', () => {
    expect(pageDescription('Widget', {})).toBe('Widget component.');
  });
});

describe('pattern pages: one per module the /patterns entry re-exports', () => {
  const patternsSource = readFileSync(join(ROOT, 'src/patterns.ts'), 'utf8');

  it('names each module by its PascalCase primary component', () => {
    expect(
      patternComponents(
        "export * from './app/components/metric-tiles';\nexport * from './app/components/form';",
      ),
    ).toEqual(['MetricTiles', 'Form']);
  });

  it('every pattern has a spec, a page under /docs/patterns and a live preview', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'public/hds-manifest.json'), 'utf8'));
    const names = patternComponents(patternsSource) as string[];
    expect(names.length).toBeGreaterThan(0);
    const pages = buildComponentPages({
      manifest,
      api: {},
      core: names,
      section: 'patterns',
      entry: '@hirobius/design-system/patterns',
    }) as Map<string, string>;
    for (const n of names) {
      expect(manifest.componentSpecs[n], n).toBeDefined();
      expect(PREVIEWED_COMPONENTS, n).toContain(n);
      const mdx = pages.get(componentSlug(n));
      expect(mdx).toContain(`import { ${n} } from '@hirobius/design-system/patterns';`);
    }
  });

  it('every core component page has a live preview', () => {
    for (const n of (CORE_COMPONENTS as string[]).filter((c) => !PROVIDERS.includes(c))) {
      expect(PREVIEWED_COMPONENTS, n).toContain(n);
    }
  });
});

describe('readerText: no maintainer references on public pages', () => {
  it.each([
    [
      'Dropdown built on Radix Select (ADR-001 Radix convention).',
      'Dropdown built on Radix Select.',
    ],
    ['Five roles plus mono (hds#483).', 'Five roles plus mono.'],
    ['Keeps its own focus tracking, per ADR-015.', 'Keeps its own focus tracking.'],
    ['Gate is check-type-ramp (scripts/check-type-ramp.mjs).', 'Gate is check-type-ramp.'],
    ['Plain text stays.', 'Plain text stays.'],
  ])('%s', (input, out) => {
    expect(readerText(input)).toBe(out);
  });
});

describe('page trimming', () => {
  const spec = { description: 'A thing.', usage: { when: 'A thing.' } };
  const page = (api: unknown, s: Record<string, unknown> = spec) =>
    (
      buildComponentPages({
        manifest: { componentSpecs: { Thing: s } },
        api,
        core: ['Thing'],
      }) as Map<string, string>
    ).get('thing')!;

  it('leaves out deprecated props and an all-empty Default column', () => {
    const p = page({
      components: {
        Thing: {
          props: [
            { name: 'size', type: 'string', required: false, description: 'Size.' },
            { name: 'old', type: 'boolean', required: false, description: '@deprecated Use size.' },
          ],
        },
      },
    });
    expect(p).toContain('| Prop | Type | Description |');
    expect(p).toContain('`size`');
    expect(p).not.toContain('`old`');
  });

  it('has no Design tokens section when the manifest maps no tokens', () => {
    expect(page({})).not.toContain('<summary>Design tokens</summary>');
    expect(page({}, { ...spec, tokenMapping: { Fill: 'semantic.color.surface.page' } })).toContain(
      '<summary>Design tokens</summary>',
    );
  });

  it('does not repeat the subtitle in Best practices', () => {
    expect(page({})).not.toContain('## Best practices');
  });

  it('puts the example first, code and reference folded (Geist order)', () => {
    const p = page({
      components: {
        Thing: { props: [{ name: 'a', type: 'string', required: false, description: 'A.' }] },
      },
    });
    const body = p.slice(p.indexOf('---', 3) + 3).trim();
    expect(body.startsWith('{/* preview: Thing */}')).toBe(true);
    expect(p).toContain('<summary>Show code</summary>');
    expect(p).toContain('<summary>API · 1 prop</summary>');
    expect(p).not.toContain('## Live Preview');
    expect(p).not.toContain('## Related Components');
  });
});
