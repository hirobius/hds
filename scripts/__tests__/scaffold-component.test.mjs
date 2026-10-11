/**
 * Tests for scripts/scaffold-component.mjs (`pnpm hds:new`).
 *
 * The scaffolder resolves every path from its own location, so each test copies
 * it plus the component template into a throwaway mini-root and runs the real
 * CLI there. Nothing touches the repo's own src/, public/ or fixtures/.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const roots = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

function makeMiniRoot() {
  const root = mkdtempSync(join(tmpdir(), 'hds-scaffold-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'templates'), { recursive: true });
  mkdirSync(join(root, 'public'), { recursive: true });
  mkdirSync(join(root, 'src', 'app', 'components'), { recursive: true });
  mkdirSync(join(root, 'docs-site', 'components'), { recursive: true });
  mkdirSync(join(root, 'docs-site', 'lib'), { recursive: true });
  copyFileSync(
    join(REPO_ROOT, 'scripts', 'scaffold-component.mjs'),
    join(root, 'scripts', 'scaffold-component.mjs'),
  );
  copyFileSync(
    join(REPO_ROOT, 'templates', 'component-template.tsx'),
    join(root, 'templates', 'component-template.tsx'),
  );
  // The real docs-site registries, so the scaffold's anchors are tested against
  // the files it edits and a reshuffle of either fails here.
  for (const file of ['components/component-demos.tsx', 'lib/previewed-components.ts']) {
    copyFileSync(join(REPO_ROOT, 'docs-site', file), join(root, 'docs-site', file));
  }
  writeFileSync(join(root, 'public', 'hds-manifest.json'), '{ "componentSpecs": {} }\n');
  return root;
}

// Strip GIT_* so nothing the scaffolder (or a future finalize step) spawns can
// be pointed at a real repository by a hook-exported GIT_DIR.
function cleanEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
}

function runScaffold(root, args) {
  return spawnSync(process.execPath, [join(root, 'scripts', 'scaffold-component.mjs'), ...args], {
    cwd: root,
    env: cleanEnv(),
    encoding: 'utf8',
  });
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const DEMOS = ['docs-site', 'components', 'component-demos.tsx'];
const PREVIEWED = ['docs-site', 'lib', 'previewed-components.ts'];

describe('scaffold-component — what a new component gets', () => {
  it('writes the component, test and fixture, and a docs demo instead of a story, with no Figma Code Connect file', () => {
    const root = makeMiniRoot();
    const before = listFiles(root).map((file) => relative(root, file).replace(/\\/g, '/'));
    const result = runScaffold(root, ['Example', '--no-generate']);
    expect(result.status, result.stderr).toBe(0);

    const written = listFiles(root)
      .map((file) => relative(root, file).replace(/\\/g, '/'))
      .filter((file) => !file.startsWith('scripts/') && !file.startsWith('templates/'))
      .sort();

    expect(written).toEqual(
      [
        ...before.filter((file) => file.startsWith('docs-site/')),
        'fixtures/swiss-canon/example-clean/expected.json',
        'fixtures/swiss-canon/example-clean/input.jsx',
        'public/hds-manifest.json',
        'src/app/components/example.test.tsx',
        'src/app/components/example.tsx',
      ].sort(),
    );
    expect(written.some((file) => file.includes('stories'))).toBe(false);
  });

  it('registers the demo: import, function, DEMOS entry and the previewed name, before the patterns', () => {
    const root = makeMiniRoot();
    const result = runScaffold(root, ['Example', '--no-generate']);
    expect(result.status, result.stderr).toBe(0);

    const demos = readFileSync(join(root, ...DEMOS), 'utf8');
    expect(demos).toMatch(/\n {2}Example,\n\} from '@hirobius\/design-system';/);
    expect(demos).toContain('function ExampleDemo() {');
    expect(demos).toContain('<Example variant="secondary">Secondary</Example>');
    expect(demos).toMatch(/export const DEMOS[\s\S]*\n {2}Example: ExampleDemo,\n\};/);

    const previewed = readFileSync(join(root, ...PREVIEWED), 'utf8');
    expect(previewed.indexOf("  'Example',\n")).toBeGreaterThan(
      previewed.indexOf("'VisuallyHidden'"),
    );
    expect(previewed.indexOf("  'Example',\n")).toBeLessThan(previewed.indexOf('// Patterns ('));
  });

  it('refuses a component that already has a demo, and one whose registry lost its anchors, writing nothing', () => {
    const twice = makeMiniRoot();
    expect(runScaffold(twice, ['Example', '--no-generate']).status).toBe(0);
    rmSync(join(twice, 'src', 'app', 'components', 'example.tsx'));
    rmSync(join(twice, 'src', 'app', 'components', 'example.test.tsx'));
    writeFileSync(join(twice, 'public', 'hds-manifest.json'), '{ "componentSpecs": {} }\n');
    const again = runScaffold(twice, ['Example', '--no-generate']);
    expect(again.status).toBe(1);
    expect(again.stderr).toMatch(/Example already has a docs demo/);

    const drifted = makeMiniRoot();
    writeFileSync(
      join(drifted, ...PREVIEWED),
      'export const PREVIEWED_COMPONENTS = [] as const;\n',
    );
    const result = runScaffold(drifted, ['Example', '--no-generate']);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/previewed-components\.ts: expected to find/);
    expect(listFiles(join(drifted, 'src'))).toEqual([]);
  });

  it('plans the docs demo in --dry-run and writes nothing, Code Connect or otherwise', () => {
    const root = makeMiniRoot();
    const demosBefore = readFileSync(join(root, ...DEMOS), 'utf8');
    const result = runScaffold(root, ['Example', '--dry-run']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('would write component');
    expect(result.stdout).toContain('would add docs demo');
    expect(result.stdout).not.toMatch(/code-connect|\.figma\.|stories/i);
    expect(readFileSync(join(root, ...DEMOS), 'utf8')).toBe(demosBefore);
    expect(listFiles(join(root, 'src'))).toEqual([]);
  });
});
