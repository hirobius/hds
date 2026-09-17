/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `pnpm figma:links` end to end on disk, and the repository gate: the README
 * section, Storybook's `parameters.design` and the Figma carriers all come
 * from `componentSpecs[].figmaUrl` in public/hds-manifest.json.
 *
 * Seams: writeDesignLinks / checkDesignLinks against a temporary mini-root, then
 * checkDesignLinks and src/stories/design-parameters.ts against this repo.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { format } from 'prettier';
import { checkDesignLinks, computeDesignLinks, writeDesignLinks } from '../figma-links.mjs';
import { designParameters, figmaDesignParameter } from '../../src/stories/design-parameters.ts';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE_URL = 'https://www.figma.com/design/FileKey123/HDS?node-id=33-34';

let dirs = [];
afterEach(() => {
  dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  dirs = [];
});

function miniRoot() {
  const root = mkdtempSync(join(tmpdir(), 'hds-figma-links-'));
  dirs.push(root);
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  write('package.json', JSON.stringify({ name: '@hirobius/design-system' }));
  write(
    'figma/links.json',
    JSON.stringify({
      repository: 'https://github.com/hirobius/hds',
      branch: 'main',
      storybookUrl: null,
    }),
  );
  write(
    'public/hds-manifest.json',
    JSON.stringify({
      componentSpecs: {
        Alert: {
          figmaUrl: NODE_URL,
          filePath: 'src/app/components/alert.tsx',
          description: 'Alert.',
        },
        Badge: { figmaUrl: null, filePath: 'src/app/components/badge.tsx' },
      },
    }),
  );
  write(
    'src/stories/alert.stories.tsx',
    `import { designParameters } from './design-parameters';
const meta = { title: 'Primitives/alert', component: Alert, tags: ['autodocs'], parameters: { ...designParameters('Alert') } };
export default meta;
export const Info = {};
`,
  );
  write('README.md', '# HDS\n\n## Architecture\n\nText.\n\n## Visual direction: X\n\nMore.\n');
  return root;
}

describe('pnpm figma:links', () => {
  it('writes the README section, the dev resources body and the descriptions scripts', async () => {
    const root = miniRoot();
    const outDir = join(root, 'figma', 'links');
    expect((await checkDesignLinks(root)).readmeUpToDate).toBe(false);

    const result = await writeDesignLinks({ root, outDir });
    expect(result.problems).toEqual([]);
    expect(result.files).toEqual([
      'dev-resources.json',
      'use-figma/descriptions-FileKey123.dry-run.js',
      'use-figma/descriptions-FileKey123.js',
    ]);

    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    expect(readme).toContain('## Design ↔ Code links');
    expect(readme).toContain('**1 of 2** components link a Figma node.');
    expect(readme.indexOf('## Design ↔ Code links')).toBeLessThan(
      readme.indexOf('## Visual direction'),
    );
    expect(await format(readme, { parser: 'markdown' })).toBe(readme);

    expect(JSON.parse(readFileSync(join(outDir, 'dev-resources.json'), 'utf8'))).toEqual({
      dev_resources: [
        {
          name: 'HDS source',
          url: 'https://github.com/hirobius/hds/blob/main/src/app/components/alert.tsx',
          file_key: 'FileKey123',
          node_id: '33:34',
        },
        {
          name: 'HDS story',
          url: 'https://github.com/hirobius/hds/blob/main/src/stories/alert.stories.tsx',
          file_key: 'FileKey123',
          node_id: '33:34',
        },
      ],
    });
    expect(
      readFileSync(join(outDir, 'use-figma', 'descriptions-FileKey123.dry-run.js'), 'utf8'),
    ).toContain('"dryRun":true');

    expect(await checkDesignLinks(root)).toEqual({
      problems: [],
      readmeUpToDate: true,
      links: 1,
      total: 2,
    });
    await writeDesignLinks({ root, outDir });
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(readme);
  });

  it('reports problems and still refuses to call the README current', async () => {
    const root = miniRoot();
    writeFileSync(
      join(root, 'src', 'stories', 'alert.stories.tsx'),
      "const meta = { title: 'Primitives/alert', component: Alert };\nexport default meta;\n",
    );
    const check = await checkDesignLinks(root);
    expect(check.problems).toEqual([
      "src/stories/alert.stories.tsx: spread designParameters('Alert') into the meta parameters, so Storybook's Design tab shows the Figma node from the manifest.",
    ]);
  });

  it('reads a missing input as a loud error that names the file, not a default', () => {
    const root = miniRoot();
    rmSync(join(root, 'figma', 'links.json'));
    expect(() => computeDesignLinks(root)).toThrow(/figma\/links\.json is missing.*Storybook URL/);
    const other = miniRoot();
    rmSync(join(other, 'public', 'hds-manifest.json'));
    expect(() => computeDesignLinks(other)).toThrow(
      /^public\/hds-manifest\.json is missing\. Run pnpm manifest:generate\.$/,
    );
  });
});

describe('this repository', () => {
  it('has no broken or bypassed Figma links, and its README section is current (run pnpm figma:links)', async () => {
    const check = await checkDesignLinks(REPO);
    expect(check.problems).toEqual([]);
    expect(check.readmeUpToDate).toBe(true);
  });

  it('links Alert to its component set, the one node URL the repo can verify (hds#72: node 33:34)', () => {
    const alert = computeDesignLinks(REPO).links.find((link) => link.name === 'Alert');
    expect(alert).toMatchObject({ fileKey: 'c8MaVgwxOlxm4wr8wnH0Z4', nodeId: '33:34' });
  });

  it('gives Storybook the manifest figmaUrl for every linked component, and nothing for the rest', () => {
    const { links } = computeDesignLinks(REPO);
    for (const link of links) {
      expect(designParameters(link.name), link.name).toEqual({
        design: { type: 'figma', url: link.figmaUrl },
      });
    }
    const manifest = JSON.parse(readFileSync(join(REPO, 'public', 'hds-manifest.json'), 'utf8'));
    const unlinked = Object.keys(manifest.componentSpecs).find(
      (name) => manifest.componentSpecs[name].figmaUrl == null,
    );
    expect(designParameters(unlinked)).toEqual({});
    expect(designParameters('NoSuchComponent')).toEqual({});
  });

  it('turns a figma.com URL (with or without www) into parameters.design, and anything else into nothing', () => {
    const url = 'https://figma.com/design/FileKey123/HDS?node-id=1-2';
    expect(figmaDesignParameter(url)).toEqual({ design: { type: 'figma', url } });
    expect(figmaDesignParameter(NODE_URL)).toEqual({ design: { type: 'figma', url: NODE_URL } });
    expect(figmaDesignParameter('TODO:hds-master:Alert')).toEqual({});
    expect(figmaDesignParameter('https://figma.com.example.org/design/x')).toEqual({});
    expect(figmaDesignParameter(null)).toEqual({});
  });

  it.each([
    ['alert', 'Alert'],
    ['avatar', 'Avatar'],
    ['badge', 'Badge'],
    ['button', 'Button'],
    ['checkbox', 'HdsCheckbox'],
    ['input', 'Input'],
    ['radio', 'HdsRadio'],
    ['tag', 'Tag'],
  ])('pre-wires the %s story (a Figma-built component) to designParameters', (file, name) => {
    const path = join(REPO, 'src', 'stories', `${file}.stories.tsx`);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8')).toContain(`...designParameters('${name}')`);
  });
});
