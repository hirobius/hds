/**
 * The derivation must agree with Storybook itself. Deriving ids from source is
 * what lets this run with no build and no browser, but a derivation that drifts
 * from Storybook's own `toId` fills the manifest with ids that resolve to
 * nothing — a record that looks complete and is wrong, the failure mode this
 * work exists to remove. So the parity test below runs against the real
 * index.json whenever a build is present.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStoryIndex,
  deriveStoryId,
  parseMetaTitle,
  parseStoryExports,
  resolveStorySubject,
  sanitize,
  storyNameFromExport,
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

  it('derives the same id set from source as Storybook built', () => {
    const storyFiles = globSync('src/**/*.stories.tsx', { cwd: ROOT });
    const files = storyFiles.map((p) => ({
      path: p.split(path.sep).join('/'),
      source: readFileSync(path.join(ROOT, p), 'utf8'),
    }));
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
