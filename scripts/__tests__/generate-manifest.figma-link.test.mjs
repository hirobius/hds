/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Regression cover for `componentSpecs[].figmaLink` regeneration (release hold
 * R4).
 *
 * `scripts/generate-manifest.mjs` used to resolve the link as
 * `resolveFigmaLink(current.figmaLink, entry.figmaUrl, current.figmaUrl)`, so
 * the value already committed to public/hds-manifest.json won. Removing a
 * component's `@figma` JSDoc tag left the old URL in the manifest, and changing
 * the tag left it pointing at the old node — `doc-page-header.tsx` reads
 * `figmaLink` before `figmaUrl`, so "View in Figma" sent a reader to a node the
 * component no longer maps to. Nothing in CI could see it: the tag and the link
 * disagreeing is not drift, it is what regen produced.
 *
 * Seam: the generator itself, run by `node` against a synthetic mini-root that
 * holds only the files it reads (one component, one seeded manifest). The
 * mini-root lives under `<repo>/temp/` (gitignored) rather than the OS temp
 * directory so that `import ts from 'typescript'` in component-discovery.mjs
 * still resolves through the repo's node_modules. Spawns no git — GIT_* is
 * stripped from the child environment.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { figmaLinkCoverage } from '../lib/figma-link.mjs';
import { computeDesignLinks } from '../figma-links.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OLD_NODE = 'https://www.figma.com/design/FileKey123/HDS?node-id=33-34';
const NEW_NODE = 'https://www.figma.com/design/FileKey123/HDS?node-id=41-7';

/** Scripts the generator loads. `scripts/lib` covers every local module import. */
const GENERATOR_FILES = [
  'generate-manifest.mjs',
  'component-discovery.mjs',
  'generate-manifest-projection.mjs',
];

let roots = [];
afterEach(() => {
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }));
  roots = [];
});

/** One component source with, or without, an `@figma` tag. */
function widgetSource(figmaUrl) {
  return [
    '/**',
    ' * Demo widget.',
    ' *',
    ' * @category Inputs',
    ' * @tier primitive',
    ...(figmaUrl ? [` * @figma ${figmaUrl}`] : []),
    ' */',
    'export const DemoWidget = () => null;',
    '',
  ].join('\n');
}

/**
 * Runs `node scripts/generate-manifest.mjs` over a mini-root seeded with a
 * manifest that already carries `committed` as DemoWidget's figmaLink/figmaUrl.
 *
 * @param {{ tag: string | null, committed?: string | null, extraSpecs?: object }} options
 * @returns {{ stdout: string, specs: Record<string, any> }}
 */
function regenerate({ tag, committed = OLD_NODE, extraSpecs = {} }) {
  mkdirSync(join(REPO, 'temp'), { recursive: true });
  const root = mkdtempSync(join(REPO, 'temp', 'manifest-figma-link-'));
  roots.push(root);

  mkdirSync(join(root, 'scripts'), { recursive: true });
  cpSync(join(REPO, 'scripts', 'lib'), join(root, 'scripts', 'lib'), { recursive: true });
  for (const file of GENERATOR_FILES) {
    cpSync(join(REPO, 'scripts', file), join(root, 'scripts', file));
  }

  mkdirSync(join(root, 'src', 'app', 'components'), { recursive: true });
  writeFileSync(join(root, 'src', 'app', 'components', 'demo-widget.tsx'), widgetSource(tag));

  mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(
    join(root, 'public', 'hds-manifest.json'),
    `${JSON.stringify(
      {
        componentSpecs: {
          DemoWidget: { figmaLink: committed, figmaUrl: committed },
          ...extraSpecs,
        },
      },
      null,
      2,
    )}\n`,
  );

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  const stdout = execFileSync(process.execPath, [join(root, 'scripts', 'generate-manifest.mjs')], {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const manifest = JSON.parse(readFileSync(join(root, 'public', 'hds-manifest.json'), 'utf8'));
  return { stdout, specs: { ...manifest.componentSpecs, ...manifest.utilities } };
}

describe('generate-manifest figmaLink regeneration', () => {
  it('clears a committed figmaLink when the @figma tag is removed', () => {
    const { specs } = regenerate({ tag: null });
    expect(specs.DemoWidget.figmaUrl).toBeNull();
    expect(specs.DemoWidget.figmaLink).toBeNull();
  });

  it('follows the @figma tag to its new node when the tag changes', () => {
    const { specs } = regenerate({ tag: NEW_NODE });
    expect(specs.DemoWidget.figmaUrl).toBe(NEW_NODE);
    expect(specs.DemoWidget.figmaLink).toBe(NEW_NODE);
  });

  it('leaves an unchanged tag alone, so regen is a no-op for a mapped component', () => {
    const { specs } = regenerate({ tag: OLD_NODE });
    expect(specs.DemoWidget.figmaLink).toBe(OLD_NODE);
  });

  it('keeps a curated link on a spec discovery does not revisit', () => {
    // No filePath, so the orphan prune leaves it; no source, so no tag can
    // speak for it. Only specs discovery rebuilds follow the tag rule above.
    const { specs } = regenerate({
      tag: OLD_NODE,
      extraSpecs: { DocsOnly: { figmaLink: OLD_NODE, tier: 'pattern' } },
    });
    expect(specs.DocsOnly.figmaLink).toBe(OLD_NODE);
  });

  it('reports a Figma link count that matches the manifest it just wrote', () => {
    const removed = regenerate({ tag: null });
    expect(removed.stdout).toContain('Figma links: 0 of 1 component specs (0%)');

    const mapped = regenerate({ tag: NEW_NODE });
    expect(mapped.stdout).toContain('Figma links: 1 of 1 component specs (100%)');
  });
});

describe('public/hds-manifest.json', () => {
  it('counts the same Figma links as pnpm figma:links, so neither report can drift', () => {
    const manifest = JSON.parse(readFileSync(join(REPO, 'public', 'hds-manifest.json'), 'utf8'));
    const coverage = figmaLinkCoverage(manifest.componentSpecs);
    const links = computeDesignLinks(REPO);
    expect({ linked: coverage.linked, total: coverage.total }).toEqual({
      linked: links.links.length,
      total: links.total,
    });
  });
});
