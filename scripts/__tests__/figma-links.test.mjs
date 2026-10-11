/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `pnpm figma:links` end to end on disk, and the repository gate: the design
 * links doc and the Figma carriers all come from `componentSpecs[].figmaUrl`
 * in public/hds-manifest.json, and the docs links from `docsPage` + docsUrl.
 *
 * Seams: writeDesignLinks / checkDesignLinks against a temporary mini-root, then
 * checkDesignLinks against this repo.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { format } from 'prettier';
import {
  DESIGN_LINKS_DOC,
  checkDesignLinks,
  computeDesignLinks,
  writeDesignLinks,
} from '../figma-links.mjs';

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
      docsUrl: 'https://docs.example.org',
    }),
  );
  write(
    'public/hds-manifest.json',
    JSON.stringify({
      componentSpecs: {
        Alert: {
          figmaUrl: NODE_URL,
          filePath: 'src/app/components/alert.tsx',
          docsPage: '/docs/components/alert',
          description: 'Alert.',
        },
        Badge: { figmaUrl: null, filePath: 'src/app/components/badge.tsx' },
      },
    }),
  );
  write('README.md', '# HDS\n\n## Architecture\n\nText.\n\n## Visual direction: X\n\nMore.\n');
  return root;
}

describe('pnpm figma:links', () => {
  it('writes the design links doc, the dev resources body and the descriptions scripts', async () => {
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

    const readme = readFileSync(join(root, DESIGN_LINKS_DOC), 'utf8');
    expect(readFileSync(join(root, 'README.md'), 'utf8')).not.toContain('Design ↔ Code links');
    expect(readme).toContain('## Design ↔ Code links');
    expect(readme).toContain('](https://docs.example.org/docs/components/alert)');
    expect(readme).toContain('**1 of 2** components link a Figma node.');
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
          name: 'HDS docs',
          url: 'https://docs.example.org/docs/components/alert',
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
      readmeDiff: null,
      links: 1,
      total: 2,
    });
    await writeDesignLinks({ root, outDir });
    expect(readFileSync(join(root, DESIGN_LINKS_DOC), 'utf8')).toBe(readme);
  });

  it('reports a node URL that is not a Figma node, and still refuses to call the README current', async () => {
    const root = miniRoot();
    const manifestPath = join(root, 'public', 'hds-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.componentSpecs.Alert.figmaUrl = 'https://www.figma.com/design/FileKey123/HDS';
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const check = await checkDesignLinks(root);
    expect(check.problems).toEqual([
      'Alert: figmaUrl is not a Figma node URL (…/design/<file>/<name>?node-id=<x>-<y>): https://www.figma.com/design/FileKey123/HDS',
    ]);
    expect(check.readmeUpToDate).toBe(false);
  });

  it('reads a missing input as a loud error that names the file, not a default', () => {
    const root = miniRoot();
    rmSync(join(root, 'figma', 'links.json'));
    expect(() => computeDesignLinks(root)).toThrow(/figma\/links\.json is missing.*docs site URL/);
    const other = miniRoot();
    rmSync(join(other, 'public', 'hds-manifest.json'));
    expect(() => computeDesignLinks(other)).toThrow(
      /^public\/hds-manifest\.json is missing\. Run pnpm manifest:generate\.$/,
    );
  });
});

describe('this repository', () => {
  it('has no broken or bypassed Figma links, and its design links doc is current (run pnpm figma:links)', async () => {
    const check = await checkDesignLinks(REPO);
    expect(check.problems).toEqual([]);
    // Assert through readmeDiff, not the bare boolean: a bare
    // `expected false to be true` names neither the file nor the change, which
    // is what made hds#229 expensive to diagnose.
    expect(check.readmeDiff).toBeNull();
    expect(check.readmeUpToDate).toBe(true);
  });

  it('links Alert to its component set, the one node URL the repo can verify (hds#72: node 33:34)', () => {
    const alert = computeDesignLinks(REPO).links.find((link) => link.name === 'Alert');
    expect(alert).toMatchObject({ fileKey: '2VgBbVpKiDnu0aftJEVyBQ', nodeId: '33:34' });
  });

  it('links every core component and pattern that has a Figma node to its docs page', () => {
    const manifest = JSON.parse(readFileSync(join(REPO, 'public', 'hds-manifest.json'), 'utf8'));
    const docsUrl = JSON.parse(readFileSync(join(REPO, 'figma', 'links.json'), 'utf8')).docsUrl;
    const { links } = computeDesignLinks(REPO);
    const button = links.find((link) => link.name === 'Button');
    expect(button.docs).toEqual({
      path: '/docs/components/button',
      url: `${docsUrl.replace(/\/+$/, '')}/docs/components/button`,
    });
    for (const link of links) {
      expect(link.docs?.path ?? null, link.name).toBe(manifest.componentSpecs[link.name].docsPage);
    }
  });
});
