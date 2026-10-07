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
import { buildComponentPages, componentSlug } from '../../scripts/lib/docs-component-pages.mjs';
// @ts-expect-error — plain .mjs module, no types
import { CORE_COMPONENTS } from '../../scripts/lib/core-components.mjs';
import { PREVIEWED_COMPONENTS } from '../../docs-site/lib/previewed-components';

const ROOT = join(__dirname, '..', '..');
const PROVIDERS = ['HdsRouterProvider', 'HdsThemeProvider', 'ToastProvider'];

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
    expect(page).toContain('**Use when:** Show a \\{widget\\} for \\<b> | pipes.');
    expect(page).toContain('**Not when:** Show a gadget.');
    // Gadget is not a core component here, so there is no page to link to.
    expect(page).toContain('- `Gadget`: gadgets');
    expect(page).toContain('| `Enter/Space` | Activates the widget. |');
    expect(page).toContain('Needs a name');
  });

  it('escapes MDX-significant characters in prose', () => {
    expect(page).toContain('**Use when:** Show a \\{widget\\} for \\<b> | pipes.');
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

  it('covers CORE_COMPONENTS minus the three providers', () => {
    const pages = buildComponentPages({
      manifest,
      api,
      core: CORE_COMPONENTS,
      providers: PROVIDERS,
    });
    const expected = (CORE_COMPONENTS as string[])
      .filter((n) => !PROVIDERS.includes(n))
      .map(componentSlug)
      .sort();
    expect([...pages.keys()].sort()).toEqual(expected);
    expect(expected).toHaveLength(40);
  });

  it('generated output passes scripts/check-docs.mjs (membership, markers, frontmatter)', () => {
    const pages = buildComponentPages({
      manifest,
      api,
      core: CORE_COMPONENTS,
      providers: PROVIDERS,
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
    expect(readdirSync(join(root, 'content/docs/components'))).toHaveLength(40);
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
