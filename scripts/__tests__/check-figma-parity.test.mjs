// @vitest-environment node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-parity.mjs and scripts/lib/figma-parity.mjs.
 *
 * The unit tests give `parity()` a small read and a small code record, so each
 * rule is proven to fire and to stay quiet. The integration test at the end
 * runs the real gate on the committed read, baseline and code: it is what makes
 * `pnpm test` fail on new drift.
 */
import { describe, it, expect } from 'vitest';
import {
  ingestRead,
  indexRead,
  parity,
  propertyNameProblem,
  formatParity,
} from '../lib/figma-parity.mjs';
import { hdsParityDigest } from '../lib/figma-parity-runtime.mjs';
import {
  buildParityComponentsScript,
  buildParityVariablesScript,
} from '../lib/figma-parity-scripts.mjs';
import { runParityCheck } from '../check-figma-parity.mjs';
import { loadApi } from '../lib/figma-parity-run.mjs';

const KEY = 'LIBRARYKEY0000000000000';

const button = (over = {}) => ({
  id: '1:1',
  name: 'Button',
  type: 'SET',
  variants: 6,
  props: [
    ['Label', 'TEXT', 'Button'],
    ['Size', 'VARIANT', 'md', ['sm', 'md', 'lg']],
    ['State', 'VARIANT', 'rest', ['rest', 'hover']],
    ['Show icon', 'BOOLEAN', false],
  ],
  nests: [],
  ...over,
});

const read = (components, { pages = [] } = {}) => ({
  fileKey: KEY,
  readOn: '2026-11-15',
  variables: {
    top: 't',
    collections: [],
    textStyles: { count: 0, hash: 'a' },
    effectStyles: { count: 0, hash: 'b' },
  },
  pages: [{ id: '0:1', name: 'Button', components }, ...pages],
});

const code = (over = {}, extra = []) => ({
  components: [
    {
      name: 'Button',
      class: 'library',
      deprecated: false,
      filePath: 'src/button.tsx',
      nodeId: '1:1',
      props: {
        children: { type: 'ReactNode' },
        size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
      },
      consumers: [],
      ...over,
    },
    ...extra,
  ],
  templates: {},
});

const kinds = (result) => result.findings.map((f) => f.id);

describe('parity: components', () => {
  it('is clean when Figma and code agree', () => {
    const result = parity({ read: read([button()]), code: code() });
    expect(kinds(result)).toEqual([]);
    expect(result.score.percent).toBe(100);
  });

  it('reports a library component with no Figma node', () => {
    const result = parity({ read: read([]), code: code({ nodeId: null }) });
    expect(kinds(result)).toEqual(['missing-in-figma:Button']);
  });

  it('does not report a layout or deprecated component with no Figma node', () => {
    expect(
      kinds(parity({ read: read([]), code: code({ nodeId: null, class: 'layout' }) })),
    ).toEqual([]);
    expect(
      kinds(parity({ read: read([]), code: code({ nodeId: null, deprecated: true }) })),
    ).toEqual([]);
  });

  it('reports a Figma component code does not have', () => {
    const result = parity({
      read: read([button(), { id: '2:2', name: 'Carousel', type: 'ONE', props: [], nests: [] }]),
      code: code(),
    });
    expect(kinds(result)).toEqual(['missing-in-code:Carousel']);
  });

  it('reports a tag that names a variant, and still compares the set of the same name', () => {
    const result = parity({ read: read([button({ id: '9:9' })]), code: code() });
    expect(kinds(result)).toEqual(['tag-not-on-component:Button']);
    expect(result.findings[0].fixHint).toContain('9:9');
  });

  it('reports a Figma component code has but does not link', () => {
    const result = parity({
      read: read([button(), { id: '3:3', name: 'Stack', type: 'ONE', props: [], nests: [] }]),
      code: code({}, [{ name: 'Stack', class: 'layout', nodeId: null, props: {}, consumers: [] }]),
    });
    expect(kinds(result)).toEqual(['unlinked:Stack']);
  });

  it('reports different names on a linked pair', () => {
    const result = parity({ read: read([button({ name: 'Btn' })]), code: code() });
    expect(kinds(result)).toEqual(['name-mismatch:Button']);
  });

  it('accepts a part recorded in mapping-overrides, and reports one that is not', () => {
    const part = { id: '4:4', name: 'PageButton', type: 'SET', props: [], nests: [] };
    const withPart = read([button({ nests: ['PageButton'] }), part]);
    expect(kinds(parity({ read: withPart, code: code() }))).toEqual([
      'part-not-recorded:PageButton',
    ]);
    const recorded = { ...code(), overrides: [{ nodeId: '4:4', mapsTo: 'Button (internal)' }] };
    expect(kinds(parity({ read: withPart, code: recorded }))).toEqual([]);
  });

  it('ignores archive, deprecated and tooling pages, and underscore names', () => {
    const index = indexRead(
      read([button(), { id: '5:5', name: '_Draft', type: 'ONE' }], {
        pages: [
          { id: '0:2', name: 'Archive', components: [{ id: '6:6', name: '_Old', type: 'ONE' }] },
          {
            id: '0:3',
            name: 'Spec sheet kit',
            components: [{ id: '7:7', name: '_SpecSheet/Cell', type: 'ONE' }],
          },
        ],
      }),
    );
    expect(index.live.map((c) => c.name)).toEqual(['Button']);
    expect(index.retired.map((c) => c.name)).toEqual(['_Old']);
  });

  it('compares the icon sets by kebab-case name', () => {
    const icons = {
      id: '0:9',
      name: 'Icon',
      components: [
        { id: '8:1', name: 'Icon/check', type: 'ONE' },
        { id: '8:2', name: 'Icon/home', type: 'ONE' },
      ],
    };
    const result = parity({
      read: read([button()], { pages: [icons] }),
      code: { ...code(), icons: ['Check', 'ArrowUpRight'] },
    });
    expect(kinds(result).map((id) => id.replace(/:\d+-[0-9a-f]{8}$/, ''))).toEqual([
      'icon-missing-in-figma:Icon',
      'icon-missing-in-code:Icon',
    ]);
    expect(result.findings[0].detail).toContain('arrow-up-right');
    expect(result.findings[1].detail).toContain('home');
  });
});

describe('parity: variants and properties', () => {
  const withSize = (figmaSize, codeSize) =>
    parity({
      read: read([button({ props: [['Size', 'VARIANT', figmaSize.default, figmaSize.options]] })]),
      code: code({ props: { size: { type: 'enum', ...codeSize } } }),
    });

  it('reports a Figma option code does not accept', () => {
    const result = withSize(
      { default: 'md', options: ['md', 'xl'] },
      { values: ['md'], default: 'md' },
    );
    expect(kinds(result)).toEqual(['option-not-in-code:Button:Size=xl']);
    expect(result.findings[0].severity).toBe('high');
  });

  it('reports code values Figma does not draw, as one finding', () => {
    const result = withSize(
      { default: 'md', options: ['md'] },
      { values: ['sm', 'md', 'lg'], default: 'md' },
    );
    expect(kinds(result)[0]).toMatch(/^option-not-in-figma:Button:Size:2-[0-9a-f]{8}$/);
    expect(result.findings[0].detail).toContain('sm, lg');
  });

  it('reports the same option in another letter case as low', () => {
    const result = withSize({ default: 'MD', options: ['MD'] }, { values: ['md'], default: 'md' });
    expect(kinds(result)).toEqual(['option-case:Button:Size=MD']);
  });

  it('reports different defaults', () => {
    const result = withSize(
      { default: 'sm', options: ['sm', 'md'] },
      { values: ['sm', 'md'], default: 'md' },
    );
    expect(kinds(result)).toEqual(['default-mismatch:Button:Size']);
  });

  it('reads the default option of an optional prop as "not set"', () => {
    const result = withSize(
      { default: 'none', options: ['none', 'md'] },
      { values: ['md'], optional: true },
    );
    expect(kinds(result)).toEqual([]);
  });

  it('reports a code contract axis with no Figma property', () => {
    const result = parity({
      read: read([button()]),
      code: code({
        props: {
          children: {},
          size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
          tone: { type: 'enum', values: ['neutral', 'danger'] },
        },
      }),
    });
    expect(kinds(result)).toEqual(['axis-not-in-figma:Button:tone']);
  });

  it('reports a Figma property with no prop and no reason', () => {
    const result = parity({
      read: read([
        button({
          props: [
            ['Elevated', 'VARIANT', 'false', ['false', 'true']],
            ['Size', 'VARIANT', 'md', ['sm', 'md', 'lg']],
          ],
        }),
      ]),
      code: code(),
    });
    expect(kinds(result)).toEqual(['property-not-in-code:Button:Elevated']);
  });

  it('accepts State, Show toggles, one children text and anything the registry records', () => {
    expect(kinds(parity({ read: read([button()]), code: code() }))).toEqual([]);
    const second = button({
      props: [
        ['Label', 'TEXT', 'a'],
        ['Helper', 'TEXT', 'b'],
        ['Size', 'VARIANT', 'md', ['sm', 'md', 'lg']],
      ],
    });
    expect(kinds(parity({ read: read([second]), code: code() }))).toEqual([
      'property-not-in-code:Button:Helper',
    ]);
    const recorded = {
      ...code(),
      templates: {
        Button: {
          properties: { Label: { prop: 'children' }, Helper: { figmaOnly: 'Sample text.' } },
        },
      },
    };
    expect(kinds(parity({ read: read([second]), code: recorded }))).toEqual([]);
  });

  it('honours the registry: values, and codeOnly with a reason', () => {
    const result = parity({
      read: read([button({ props: [['Size', 'VARIANT', 'Medium', ['Medium']]] })]),
      code: {
        ...code(),
        templates: {
          Button: {
            properties: {
              Size: { prop: 'size', values: { Medium: 'md' }, codeOnly: { sm: 'why', lg: 'why' } },
            },
          },
        },
      },
    });
    expect(kinds(result)).toEqual([]);
  });

  it('names what is wrong with a property name', () => {
    expect(propertyNameProblem('Show icon')).toBeNull();
    expect(propertyNameProblem('Text style')).toBeNull();
    expect(propertyNameProblem('StickyHeader')).toMatch(/two words/);
    expect(propertyNameProblem('Description2')).toMatch(/digit/);
    expect(propertyNameProblem('Show Action')).toMatch(/capital/);
  });

  it('reports a nested component the code file does not use, but never an icon', () => {
    const badge = {
      name: 'Badge',
      class: 'library',
      nodeId: '2:2',
      filePath: 'src/badge.tsx',
      props: {},
      consumers: [],
    };
    const figmaBadge = { id: '2:2', name: 'Badge', type: 'ONE', props: [], nests: [] };
    const nested = read([button({ nests: ['Badge', 'Icon'] }), figmaBadge]);
    expect(kinds(parity({ read: nested, code: code({}, [badge]) }))).toEqual([
      'nesting-mismatch:Button:Badge',
    ]);
    const used = { ...badge, consumers: ['src/button.tsx'] };
    expect(kinds(parity({ read: nested, code: code({}, [used]) }))).toEqual([]);
  });

  it('accepts a nested component the Code Connect template passes in as slot content', () => {
    const badge = {
      name: 'Badge',
      class: 'library',
      nodeId: '2:2',
      filePath: 'src/badge.tsx',
      props: {},
      consumers: [],
    };
    const figmaBadge = { id: '2:2', name: 'Badge', type: 'ONE', props: [], nests: [] };
    const nested = read([button({ nests: ['Badge'] }), figmaBadge]);
    const template = (over) => ({
      ...code({}, [badge]),
      templates: {
        Button: {
          imports: { '@hirobius/design-system': ['Badge'] },
          properties: { Label: { prop: 'children' } },
          ...over,
        },
      },
    });
    expect(
      kinds(parity({ read: nested, code: template({ children: '<Badge>New</Badge>' }) })),
    ).toEqual([]);
    // An import alone does not show the parent takes it in.
    expect(kinds(parity({ read: nested, code: template({}) }))).toEqual([
      'nesting-mismatch:Button:Badge',
    ]);
  });

  it('reads a TEXT property as the children of a Radix part that only lists asChild', () => {
    const title = button({ props: [['Title', 'TEXT', 'Edit profile']] });
    const radixPart = code({ props: { asChild: { type: 'boolean' } } });
    expect(kinds(parity({ read: read([title]), code: radixPart }))).toEqual([]);
    // A component with more props than asChild is not a bare text part.
    const richer = code({ props: { asChild: { type: 'boolean' }, open: { type: 'boolean' } } });
    expect(kinds(parity({ read: read([title]), code: richer }))).toEqual([
      'property-not-in-code:Button:Title',
    ]);
    const noChildren = code({ props: { open: { type: 'boolean' } } });
    expect(kinds(parity({ read: read([title]), code: noChildren }))).toEqual([
      'property-not-in-code:Button:Title',
    ]);
  });

  it('honours code-only values a mapping override records for a component with no template', () => {
    const gap = button({ props: [['Gap', 'VARIANT', 'tight', ['tight', 'normal']]] });
    const stack = code({
      props: { gap: { type: 'enum', values: ['tight', 'normal', 'px4', 'px8'], default: 'tight' } },
    });
    expect(kinds(parity({ read: read([gap]), code: stack }))[0]).toMatch(
      /^option-not-in-figma:Button:Gap:2-/,
    );
    const recorded = {
      ...stack,
      overrides: [{ nodeId: '1:1', codeOnly: { Gap: { values: ['px4', 'px8'], reason: 'why' } } }],
    };
    expect(kinds(parity({ read: read([gap]), code: recorded }))).toEqual([]);
    // A component with a template records code-only values there, not in an override.
    const withTemplate = {
      ...recorded,
      templates: { Button: { properties: { Gap: { prop: 'gap' } } } },
    };
    expect(kinds(parity({ read: read([gap]), code: withTemplate }))[0]).toMatch(
      /^option-not-in-figma:Button:Gap:2-/,
    );
  });
});

describe('parity: review rules', () => {
  it('a grouped finding gets a new id when its members change, so a baseline entry cannot hide new drift', () => {
    const page = (names) => ({
      id: '0:9',
      name: 'Icon',
      components: names.map((n, i) => ({ id: `8:${i}`, name: `Icon/${n}`, type: 'ONE' })),
    });
    const run = (names) =>
      kinds(
        parity({
          read: read([button()], { pages: [page(names)] }),
          code: { ...code(), icons: [] },
        }),
      )[0];
    expect(run(['home'])).not.toBe(run(['home', 'trash']));
    expect(run(['home', 'trash'])).toBe(run(['trash', 'home']));
  });

  it('a required enum prop gets no "not set" allowance', () => {
    const figma = read([button({ props: [['Size', 'VARIANT', 'none', ['none', 'md']]] })]);
    const required = code({ props: { size: { type: 'enum', values: ['md'] } } });
    expect(kinds(parity({ read: figma, code: required }))).toContain(
      'option-not-in-code:Button:Size=none',
    );
    const optional = code({ props: { size: { type: 'enum', values: ['md'], optional: true } } });
    expect(kinds(parity({ read: figma, code: optional }))).toEqual([]);
  });

  it('reports two code components that link one Figma node', () => {
    const twin = {
      name: 'Other',
      class: 'library',
      nodeId: '1:1',
      filePath: 'src/other.tsx',
      props: {},
      consumers: [],
    };
    const result = parity({ read: read([button()]), code: code({}, [twin]) });
    expect(kinds(result)).toContain('duplicate-link:Other');
  });

  it('leaves the Hirobius/Meta release stamp to the release gate', () => {
    const meta = (hash) => ({ id: 'm', name: 'Hirobius/Meta', modes: 1, variables: 6, hash });
    const styles = { textStyles: { count: 0, hash: 'a' }, effectStyles: { count: 0, hash: 'b' } };
    const result = parity({
      read: { ...read([button()]), variables: { top: 't', collections: [meta('new')], ...styles } },
      code: code(),
      variables: {
        snapshotDigest: { top: 't', collections: [meta('old')], ...styles },
        drift: { total: 0, missing: [], extra: [], changed: [] },
        unmanaged: [],
      },
    });
    expect(kinds(result)).toEqual([]);
  });
});

describe('parity: variables, age and baseline', () => {
  const collection = (hash) => ({
    id: 'c1',
    name: 'Hirobius/Semantic',
    modes: 2,
    variables: 3,
    hash,
  });
  const variables = (hash, over = {}) => ({
    snapshotDigest: {
      top: 't',
      collections: [collection(hash)],
      textStyles: { count: 0, hash: 'a' },
      effectStyles: { count: 0, hash: 'b' },
    },
    drift: { total: 3, missing: [], extra: [], changed: [] },
    unmanaged: [],
    ...over,
  });
  const liveRead = (hash) => ({
    ...read([button()]),
    variables: {
      top: 't',
      collections: [collection(hash)],
      textStyles: { count: 0, hash: 'a' },
      effectStyles: { count: 0, hash: 'b' },
    },
  });

  it('is clean when the library is the snapshot and the tokens match it', () => {
    expect(
      kinds(parity({ read: liveRead('h1'), code: code(), variables: variables('h1') })),
    ).toEqual([]);
  });

  it('reports a collection that changed after the snapshot', () => {
    const result = parity({ read: liveRead('h2'), code: code(), variables: variables('h1') });
    expect(kinds(result)).toEqual(['variables-changed:Hirobius/Semantic']);
  });

  it('reports token drift and a collection no token builds', () => {
    const result = parity({
      read: liveRead('h1'),
      code: code(),
      variables: variables('h1', {
        drift: {
          total: 3,
          missing: ['Semantic: color/a'],
          extra: ['Semantic: color/b'],
          changed: [
            { name: 'Semantic: color/c [dark]', detail: 'tokens say #000, Figma has #111' },
          ],
        },
        unmanaged: ['Button tone'],
      }),
    });
    expect(kinds(result)).toEqual([
      'token-missing-in-figma:Semantic: color/a',
      'token-extra-in-figma:Semantic: color/b',
      'token-value-mismatch:Semantic: color/c [dark]',
      'collection-not-in-code:Button tone',
    ]);
  });

  it('counts a missing variable as a failed definition check plus one per mode', () => {
    // 2 variables x 2 modes: 2 definition checks + 4 value checks + 1 collection hash.
    const result = parity({
      read: liveRead('h1'),
      code: code(),
      variables: variables('h1', {
        drift: {
          total: 6,
          missing: [{ name: 'Semantic: color/new', checks: 3 }],
          extra: [],
          changed: [],
        },
      }),
    });
    expect(kinds(result)).toEqual(['token-missing-in-figma:Semantic: color/new']);
    expect(result.score.areas.variables).toMatchObject({ total: 9, passed: 6 });
  });

  it('counts one failed check per mode whose value differs', () => {
    const result = parity({
      read: liveRead('h1'),
      code: code(),
      variables: variables('h1', {
        drift: {
          total: 6,
          missing: [],
          extra: [],
          changed: [
            { name: 'Semantic: space/a [Light]', detail: 'tokens say 8, Figma has 4' },
            { name: 'Semantic: space/a [Dark]', detail: 'tokens say 8, Figma has 4' },
          ],
        },
      }),
    });
    expect(result.score.areas.variables).toMatchObject({ total: 9, passed: 7 });
  });

  it('fails on an old read only when an age limit is given', () => {
    const base = { read: read([button()]), code: code() };
    expect(kinds(parity({ ...base, today: '2026-12-25', maxAgeDays: 14 }))).toEqual([
      'read-stale:figma/parity/read.json',
    ]);
    expect(kinds(parity({ ...base, today: '2026-11-20', maxAgeDays: 14 }))).toEqual([]);
    expect(kinds(parity(base))).toEqual([]);
  });

  it('a baseline entry accepts a finding; an entry with no finding is stale', () => {
    const result = parity({
      read: read([button({ name: 'Btn' })]),
      code: code(),
      baseline: {
        accepted: {
          'name-mismatch:Button': { reason: 'Rename waits for hds#1.' },
          'name-mismatch:Gone': { reason: 'old' },
        },
      },
    });
    expect(result.fresh).toEqual([]);
    expect(result.stale).toEqual(['name-mismatch:Gone']);
    expect(formatParity(result)).toMatch(/Stale baseline/);
  });
});

describe('the read', () => {
  const part = (index, parts, pages) => ({
    format: 'parity-components',
    file: KEY,
    part: index,
    parts,
    pageCount: 2,
    pages,
  });
  const vars = {
    format: 'parity-variables',
    file: KEY,
    takenAt: '2026-11-15T20:17:51.257Z',
    top: 't',
    collections: [],
    textStyles: { count: 0, hash: 'a' },
    effectStyles: { count: 0, hash: 'b' },
  };
  const p0 = part(0, 2, [{ id: '0:1', name: 'A', index: 0, components: [] }]);
  const p1 = part(1, 2, [{ id: '0:2', name: 'B', index: 1, components: [] }]);
  const options = { fileKey: KEY, readOn: '2026-11-15' };

  it('merges the parts in page order', () => {
    const merged = ingestRead([p1, vars, p0], options);
    expect(merged.pages.map((p) => p.name)).toEqual(['A', 'B']);
    expect(merged.variables.top).toBe('t');
  });

  it('refuses a missing part, another file, and a part that was too large', () => {
    expect(() => ingestRead([vars, p0], options)).toThrow(/every part once/);
    expect(() => ingestRead([vars, p0, { ...p1, file: 'OTHER' }], options)).toThrow(
      /not the HDS library/,
    );
    expect(() =>
      ingestRead(
        [
          vars,
          p0,
          {
            format: 'parity-components',
            tooLarge: true,
            part: 1,
            parts: 2,
            chars: 30000,
            file: KEY,
          },
        ],
        options,
      ),
    ).toThrow(/--parts 4/);
    expect(() => ingestRead([p0, p1], options)).toThrow(/No variables result/);
  });

  it('the read scripts guard the library, only read, and fit a use_figma call', () => {
    const links = {
      libraryFileKey: KEY,
      libraryFileName: 'HDS',
      retiredFiles: [],
      docsUrl: 'https://example.com',
    };
    for (const script of [
      buildParityVariablesScript(links, { name: 'HDS', key: KEY }),
      buildParityComponentsScript(links, 0, 4),
    ]) {
      expect(script.startsWith(`if (figma.fileKey !== '${KEY}'`)).toBe(true);
      expect(script.length).toBeLessThan(50000);
      expect(script).not.toMatch(
        /\.remove\(|create[A-Z]\w*\(|setValueForMode|\.appendChild\(|setBoundVariable/,
      );
    }
  });

  it('the digest changes when one variable value changes', () => {
    const snapshot = (value) => ({
      schemaVersion: 1,
      file: { name: 'HDS', key: KEY },
      lastPush: null,
      collections: [
        {
          id: 'c1',
          name: 'C',
          modes: ['Default'],
          variables: [{ id: 'v1', name: 'a', valuesByMode: { Default: { value } } }],
        },
      ],
      textStyles: [],
      effectStyles: [],
    });
    expect(hdsParityDigest(snapshot(1)).collections[0].hash).not.toBe(
      hdsParityDigest(snapshot(2)).collections[0].hash,
    );
    expect(hdsParityDigest(snapshot(1))).toEqual(hdsParityDigest(snapshot(1)));
  });
});

describe('the committed read against the committed code', () => {
  it('has no difference outside figma/parity/baseline.json, and no stale baseline entry', async () => {
    const { exitCode, result } = await runParityCheck();
    expect(result.fresh.map((f) => `${f.id} — ${f.detail}`)).toEqual([]);
    expect(result.stale).toEqual([]);
    expect(exitCode).toBe(0);
  });

  it('every baseline entry has a reason that names its issue', async () => {
    const { result } = await runParityCheck();
    for (const finding of result.findings) {
      expect(finding.accepted, finding.id).toMatch(/hds#\d+|#\d+/);
    }
  });
});

describe('parity: a node that draws an API call', () => {
  const toast = button({
    name: 'Toast',
    props: [
      ['Title', 'TEXT', 'Saved'],
      ['Tone', 'VARIANT', 'neutral', ['neutral', 'danger']],
      ['Dismiss', 'VARIANT', 'Rest', ['Rest', 'Hover']],
    ],
  });
  const provider = code({ name: 'ToastProvider', props: { children: { type: 'ReactNode' } } });
  const api = (over = {}) => ({
    name: 'Toast',
    call: 'toast()',
    figmaOnly: { Dismiss: 'Close button state preview.' },
    props: {
      title: { type: 'string', optional: false },
      tone: { type: 'enum', values: ['neutral', 'danger'], default: 'neutral', optional: true },
    },
    ...over,
  });

  it('reports a node name that is not the recorded one, even in another letter case', () => {
    const lower = { ...toast, name: 'toast' };
    expect(
      kinds(parity({ read: read([lower]), code: { ...provider, apis: { '1:1': api() } } })),
    ).toEqual(['name-mismatch:ToastProvider']);
  });

  it('compares the properties with the call options, and takes the recorded name', () => {
    expect(
      kinds(parity({ read: read([toast]), code: { ...provider, apis: { '1:1': api() } } })),
    ).toEqual([]);
  });

  it('still reports an option the call does not accept, and a property with no field', () => {
    const narrow = api({
      figmaOnly: {},
      props: { title: { type: 'string' }, tone: { type: 'enum', values: ['neutral'] } },
    });
    expect(
      kinds(parity({ read: read([toast]), code: { ...provider, apis: { '1:1': narrow } } })),
    ).toEqual([
      'option-not-in-code:ToastProvider:Tone=danger',
      'property-not-in-code:ToastProvider:Dismiss',
    ]);
  });

  it('reads the options interface and its cva axis from the real toast source', () => {
    const real = loadApi(process.cwd(), {
      call: 'toast()',
      source: 'src/app/components/toast.tsx',
      options: 'ToastOptions',
    });
    expect(Object.keys(real.props)).toEqual(
      expect.arrayContaining(['title', 'description', 'tone', 'actions']),
    );
    expect(real.props.tone).toMatchObject({ type: 'enum', default: 'neutral' });
    expect(() =>
      loadApi(process.cwd(), {
        call: 'x()',
        source: 'src/app/components/toast.tsx',
        options: 'Nope',
      }),
    ).toThrow(/no interface Nope/);
  });
});
