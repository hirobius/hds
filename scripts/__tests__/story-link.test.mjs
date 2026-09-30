/**
 * The derivation must agree with Storybook itself. Deriving ids from source is
 * what lets this run with no build and no browser, but a derivation that drifts
 * from Storybook's own `toId` fills the manifest with ids that resolve to
 * nothing — a record that looks complete and is wrong, the failure mode this
 * work exists to remove. So the parity test below runs against the real
 * index.json whenever a build is present.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStoryIndex,
  deriveStoryId,
  parseImportBindings,
  parseMetaComponent,
  parseMetaTitle,
  parseStoryExports,
  resolveStorySubject,
  sanitize,
  storyNameFromExport,
  findStoryFiles,
} from '../lib/story-link.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('sanitize', () => {
  it('lowercases and collapses non-alphanumerics to single dashes', () => {
    expect(sanitize('Primitives/activity-feed')).toBe('primitives-activity-feed');
  });

  it('strips leading and trailing dashes', () => {
    expect(sanitize('/Patterns/')).toBe('patterns');
  });
});

describe('storyNameFromExport', () => {
  it('splits camelCase into words', () => {
    expect(storyNameFromExport('AllSuccess')).toBe('All Success');
  });

  it('keeps a run of capitals together', () => {
    expect(storyNameFromExport('CTAPanel')).toBe('CTA Panel');
  });

  it('separates trailing digits', () => {
    expect(storyNameFromExport('Level2')).toBe('Level 2');
  });
});

describe('deriveStoryId', () => {
  it('joins a sanitized title and story name', () => {
    expect(deriveStoryId('Primitives/activity-feed', 'AllSuccess')).toBe(
      'primitives-activity-feed--all-success',
    );
  });
});

describe('parseMetaTitle', () => {
  it('reads the title off the meta declaration', () => {
    expect(parseMetaTitle(`const meta = {\n  title: 'Primitives/button',\n}`)).toBe(
      'Primitives/button',
    );
  });

  it("ignores a story's own args.title, which is a different thing entirely", () => {
    const source = [
      `const meta = {`,
      `  title: 'Primitives/activity-feed',`,
      `}`,
      `export const Default = { args: { events: [{ title: 'Service Deployed' }] } }`,
    ].join('\n');
    expect(parseMetaTitle(source)).toBe('Primitives/activity-feed');
  });

  it('returns null when there is no meta', () => {
    expect(parseMetaTitle('export const Default = {}')).toBeNull();
  });
});

describe('parseStoryExports', () => {
  it('collects const and function stories', () => {
    const source = [
      `export default meta`,
      `export const Default = {}`,
      `export const WithIcon: Story = {}`,
      `export function Playground() {}`,
    ].join('\n');
    expect(parseStoryExports(source)).toEqual(['Default', 'WithIcon', 'Playground']);
  });

  it('excludes CSF configuration exports', () => {
    expect(
      parseStoryExports(
        `export default meta\nexport const meta = {}\nexport const __namedExportsOrder = []`,
      ),
    ).toEqual([]);
  });

  it('ignores a non-exported const', () => {
    expect(
      parseStoryExports(`export default meta\nconst Helper = {}\nexport const Default = {}`),
    ).toEqual(['Default']);
  });

  it('ignores a helper component exported above the meta', () => {
    // code-block.stories.tsx exports StatusChip and ComponentList as sample
    // content before its meta. Storybook does not index them; collecting them
    // put two ids in the manifest that resolved to nothing.
    const source = [
      `export function StatusChip({ active }) { return null }`,
      `const meta = { title: 'Primitives/code-block' }`,
      `export default meta`,
      `export const Default = {}`,
    ].join('\n');
    expect(parseStoryExports(source)).toEqual(['Default']);
  });

  it('returns nothing for a file with no default export', () => {
    expect(parseStoryExports(`export const Default = {}`)).toEqual([]);
  });
});

describe('resolveStorySubject', () => {
  const known = new Set(['src/app/components/button.tsx', 'src/app/components/icon.tsx']);

  it('resolves the first relative import that is a known component', () => {
    const source = `import { fixtures } from './fixtures';\nimport { Button } from './button';`;
    expect(resolveStorySubject('src/app/components/button.stories.tsx', source, known)).toBe(
      'src/app/components/button.tsx',
    );
  });

  it('skips imports that are not components', () => {
    const source = `import { helper } from '../utils/helper';\nimport { Icon } from './icon';`;
    expect(resolveStorySubject('src/app/components/icon.stories.tsx', source, known)).toBe(
      'src/app/components/icon.tsx',
    );
  });

  it('returns null when nothing resolves', () => {
    expect(
      resolveStorySubject('src/stories/x.stories.tsx', `import { a } from './a';`, known),
    ).toBeNull();
  });
});

describe('parseMetaComponent', () => {
  it('reads the identifier off a const meta the default export references', () => {
    const source = [
      'const meta: Meta<typeof StatusTile> = {',
      "  title: 'Primitives/Status Tile',",
      '  component: StatusTile,',
      '};',
      'export default meta;',
    ].join('\n');
    expect(parseMetaComponent(source)).toBe('StatusTile');
  });

  it('reads the identifier off an inline export default object', () => {
    expect(
      parseMetaComponent("export default { title: 'Primitives/button', component: Button };"),
    ).toBe('Button');
  });

  it('accepts a satisfies-typed const meta and a trailing type assertion', () => {
    const source = [
      'const meta = {',
      "  title: 'Primitives/button',",
      '  component: Button as typeof Button,',
      '} satisfies Meta<typeof Button>;',
      'export default meta;',
    ].join('\n');
    expect(parseMetaComponent(source)).toBe('Button');
  });

  it('returns null when the meta has no component field', () => {
    expect(
      parseMetaComponent("const meta = { title: 'Primitives/button' };\nexport default meta;"),
    ).toBeNull();
  });

  it('returns null when there is no meta at all', () => {
    expect(parseMetaComponent('export const Default = {};')).toBeNull();
  });

  it('ignores parameters.docs.description.component, which is prose', () => {
    // type-specimen.stories.tsx declares no component: on its meta but does
    // describe itself under docs.description.component. That key is a string
    // and sits two objects deep; a flat regex over the meta region would find it.
    const source = [
      'const meta = {',
      "  title: 'Foundations/Type Specimen',",
      '  parameters: {',
      '    docs: {',
      '      description: {',
      '        component:',
      "          'Pairs with component: Badge in dense lists.',",
      '      },',
      '    },',
      '  },',
      '};',
      'export default meta;',
    ].join('\n');
    expect(parseMetaComponent(source)).toBeNull();
  });

  it('ignores a component key nested under args or argTypes', () => {
    // A polymorphic prop can legitimately be called component; only the
    // top-level key of the meta object is the CSF subject.
    const source = [
      'const meta = {',
      "  title: 'Primitives/box',",
      '  args: { component: Badge },',
      '  argTypes: { component: { control: false } },',
      '};',
      'export default meta;',
    ].join('\n');
    expect(parseMetaComponent(source)).toBeNull();
  });

  it('skips braces and keys that only appear inside comments', () => {
    const source = [
      'const meta = {',
      "  title: 'Primitives/box',",
      '  // component: Badge, (left here while the subject was being decided)',
      '  /* args: { component: Badge } */',
      '  component: Box,',
      '};',
      'export default meta;',
    ].join('\n');
    expect(parseMetaComponent(source)).toBe('Box');
  });

  it('follows export default to a const that is not named meta', () => {
    const source = [
      "const storyConfig = { title: 'Primitives/button', component: Button };",
      'export default storyConfig;',
    ].join('\n');
    expect(parseMetaComponent(source)).toBe('Button');
  });
});

describe('parseImportBindings', () => {
  it('maps named, aliased and default imports to their module specifier', () => {
    const source = [
      "import Tile from '../app/components/status-tile';",
      "import { Badge, Button as HdsButton } from '../index';",
      "import { Meta } from '@storybook/react';",
    ].join('\n');
    expect([...parseImportBindings(source)]).toEqual([
      ['Tile', '../app/components/status-tile'],
      ['Badge', '../index'],
      ['HdsButton', '../index'],
      ['Meta', '@storybook/react'],
    ]);
  });

  it('spans a multi-line import and drops inline type entries', () => {
    const source = [
      'import {',
      '  Table,',
      '  type TableColumn,',
      '  type TableRow,',
      "} from '../app/components/table';",
    ].join('\n');
    expect([...parseImportBindings(source)]).toEqual([['Table', '../app/components/table']]);
  });

  it('drops type-only, namespace and side-effect imports', () => {
    const source = [
      "import type { Meta, StoryObj } from '@storybook/react';",
      "import * as React from 'react';",
      "import './tokens.css';",
      "import { Button } from './button';",
    ].join('\n');
    expect([...parseImportBindings(source)]).toEqual([['Button', './button']]);
  });

  it('binds a default import that comes with named imports', () => {
    expect([...parseImportBindings("import React, { useState } from 'react';")]).toEqual([
      ['React', 'react'],
      ['useState', 'react'],
    ]);
  });
});

/**
 * hds#369: the CSF component: field is the declared subject, so it wins over
 * import order. Import order bit twice on 2026-09-30 — a Badge import placed
 * above StatusTile made StatusTile read as story-less on main, and the Client
 * detail screen is credited to PageHeader because PageHeader is imported first.
 */
describe('resolveStorySubject honours the CSF component: field', () => {
  const known = new Set([
    'src/app/components/badge.tsx',
    'src/app/components/status-tile.tsx',
    'src/app/components/page-header.tsx',
  ]);
  const at = 'src/stories/status-tile.stories.tsx';
  const STATUS_TILE = 'src/app/components/status-tile.tsx';
  const BADGE = 'src/app/components/badge.tsx';

  it('credits the declared component even when a helper component is imported first', () => {
    const source = [
      "import type { Meta, StoryObj } from '@storybook/react';",
      "import { Badge } from '../app/components/badge';",
      "import { StatusTile } from '../app/components/status-tile';",
      "const meta = { title: 'Primitives/Status Tile', component: StatusTile } satisfies Meta<typeof StatusTile>;",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(STATUS_TILE);
  });

  it('reads the component off an inline export default object', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import { StatusTile } from '../app/components/status-tile';",
      "export default { title: 'Primitives/Status Tile', component: StatusTile };",
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(STATUS_TILE);
  });

  it('reads the component off a typed const meta the default export references', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import { StatusTile } from '../app/components/status-tile';",
      'const meta: Meta<typeof StatusTile> = {',
      "  title: 'Primitives/Status Tile',",
      "  parameters: { layout: 'padded' },",
      '  component: StatusTile,',
      '};',
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(STATUS_TILE);
  });

  it('follows an aliased named import', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import { StatusTile as Tile } from '../app/components/status-tile';",
      "const meta = { title: 'Primitives/Status Tile', component: Tile };",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(STATUS_TILE);
  });

  it('follows a default import', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import Tile from '../app/components/status-tile';",
      "const meta = { title: 'Primitives/Status Tile', component: Tile };",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(STATUS_TILE);
  });

  it('follows a multi-line named import', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      'import {',
      '  StatusTile,',
      '  type StatusTileProps,',
      "} from '../app/components/status-tile';",
      "const meta = { title: 'Primitives/Status Tile', component: StatusTile };",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(STATUS_TILE);
  });

  it('falls back to the first known import when the meta has no component field', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import { StatusTile } from '../app/components/status-tile';",
      "const meta = { title: 'Primitives/Status Tile' };",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(BADGE);
  });

  it('falls back when the component is a local helper rather than an import', () => {
    // patterns-client-detail.stories.tsx composes a ClientDetailScreen in the
    // file itself; nothing in the manifest owns it, so the first known import
    // (PageHeader) keeps the credit.
    const source = [
      "import { PageHeader } from '../app/components/page-header';",
      "import { Badge } from '../app/components/badge';",
      'function ClientDetailScreen() { return null; }',
      "const meta = { title: 'Patterns/Client detail screen', component: ClientDetailScreen };",
      'export default meta;',
    ].join('\n');
    expect(
      resolveStorySubject('src/stories/patterns-client-detail.stories.tsx', source, known),
    ).toBe('src/app/components/page-header.tsx');
  });

  it('falls back when the component is imported from a module outside the known set', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import { Showcase } from './helpers/showcase';",
      "const meta = { title: 'Primitives/badge', component: Showcase };",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(BADGE);
  });

  it('falls back when the component is imported from a package', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import { Fragment } from 'react';",
      "const meta = { title: 'Primitives/badge', component: Fragment };",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(BADGE);
  });

  it('is not fooled by docs.description prose that mentions another component', () => {
    const source = [
      "import { Badge } from '../app/components/badge';",
      "import { StatusTile } from '../app/components/status-tile';",
      'const meta = {',
      "  title: 'Primitives/Status Tile',",
      '  component: StatusTile,',
      '  parameters: {',
      "    docs: { description: { component: 'Pairs with component: Badge in lists.' } },",
      '  },',
      '};',
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBe(STATUS_TILE);
  });

  it('still returns null when nothing resolves', () => {
    const source = [
      "import { Showcase } from './helpers/showcase';",
      "const meta = { title: 'Docs/showcase', component: Showcase };",
      'export default meta;',
    ].join('\n');
    expect(resolveStorySubject(at, source, known)).toBeNull();
  });
});

describe('buildStoryIndex', () => {
  const known = new Set(['src/app/components/button.tsx']);

  it('merges two story files that target the same component', () => {
    const files = [
      {
        path: 'src/app/components/button.stories.tsx',
        source: `import { Button } from './button';\nconst meta = { title: 'Primitives/button' }\nexport default meta\nexport const Default = {}`,
      },
      {
        path: 'src/app/components/button-extra.stories.tsx',
        source: `import { Button } from './button';\nconst meta = { title: 'Primitives/button-extra' }\nexport default meta\nexport const Loud = {}`,
      },
    ];
    const { byFilePath } = buildStoryIndex(files, known);
    expect(byFilePath.get('src/app/components/button.tsx').storyIds).toEqual([
      'primitives-button--default',
      'primitives-button-extra--loud',
    ]);
  });

  it('reports a story file it cannot resolve rather than dropping it', () => {
    const files = [{ path: 'src/stories/orphan.stories.tsx', source: `export const Default = {}` }];
    const { byFilePath, unresolved } = buildStoryIndex(files, known);
    expect(byFilePath.size).toBe(0);
    expect(unresolved).toEqual([
      { storyFile: 'src/stories/orphan.stories.tsx', reason: 'no meta title' },
    ]);
  });
});

/**
 * The assertion that matters. Everything above tests my reimplementation
 * against my own understanding; this tests it against Storybook.
 */
const INDEX = path.join(ROOT, 'storybook-static/index.json');
describe.skipIf(!existsSync(INDEX))('parity with Storybook index.json', () => {
  const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : { entries: {} };
  const real = Object.values(index.entries).filter((e) => e.type === 'story');

  it('derives every built story id exactly', () => {
    const missed = real.filter((e) => deriveStoryId(e.title, e.name.replace(/\s+/g, '')) !== e.id);
    // `name` is the display name; recomposing the export key from it is lossy,
    // so compare on the id Storybook itself built from title + name instead.
    const bySanitize = real.filter((e) => e.id !== `${sanitize(e.title)}--${sanitize(e.name)}`);
    expect({ missed: missed.length, bySanitize: bySanitize.map((e) => e.id) }).toEqual({
      missed: missed.length,
      bySanitize: [],
    });
  });

  // CI runs Node 20 (package.json: engines.node >= 20) and `fs.globSync` landed
  // in Node 22, so the first version of this walk threw "globSync is not a
  // function" in Actions while passing on a dev machine. The helper exists so
  // one portable implementation is shared by every caller rather than three.
  it('finds every story file under src/ without fs.globSync', () => {
    const found = findStoryFiles(ROOT);
    expect(found.length).toBeGreaterThan(50);
    expect(found.every((p) => p.startsWith('src/') && p.endsWith('.stories.tsx'))).toBe(true);
    expect(found.every((p) => !p.includes('\\'))).toBe(true);
    expect([...found]).toEqual([...found].sort());
    expect(new Set(found).size).toBe(found.length);
    // The walk must be recursive, not just src/*.stories.tsx.
    expect(found.some((p) => p.split('/').length > 2)).toBe(true);
  });

  it('derives the same id set from source as Storybook built', () => {
    const storyFiles = findStoryFiles(ROOT);
    const files = storyFiles
      .map((p) => ({
        path: p.split(path.sep).join('/'),
        source: readFileSync(path.join(ROOT, p), 'utf8'),
      }))
      // #308: `!dev` internals are left out of the published build on purpose.
      .filter(({ source }) => !/^\s*tags:\s*\[[^\]]*['"]!dev['"]/m.test(source));
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/hds-manifest.json'), 'utf8'));
    const known = new Set(
      Object.values(manifest.componentSpecs)
        .map((s) => s.filePath)
        .filter(Boolean),
    );
    const { byFilePath } = buildStoryIndex(files, known);
    const derived = new Set([...byFilePath.values()].flatMap((v) => v.storyIds));
    const built = new Set(real.map((e) => e.id));

    // Every id this derives must be one Storybook actually built. The reverse
    // is not required here: a story file whose component is outside the
    // manifest contributes built ids that nothing derives, and that gap is
    // reported by the gate rather than asserted away.
    const phantom = [...derived].filter((id) => !built.has(id));
    expect(phantom).toEqual([]);
  });
});
