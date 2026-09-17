/**
 * Tests for scripts/scaffold-component.mjs (`pnpm hds:new`).
 *
 * The scaffolder resolves every path from its own location, so each test copies
 * it plus the component template into a throwaway mini-root and runs the real
 * CLI there. Nothing touches the repo's own src/, public/ or fixtures/.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { copyFileSync, mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
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
  mkdirSync(join(root, 'src', 'stories'), { recursive: true });
  copyFileSync(
    join(REPO_ROOT, 'scripts', 'scaffold-component.mjs'),
    join(root, 'scripts', 'scaffold-component.mjs'),
  );
  copyFileSync(
    join(REPO_ROOT, 'templates', 'component-template.tsx'),
    join(root, 'templates', 'component-template.tsx'),
  );
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

describe('scaffold-component — Code Connect output', () => {
  it('writes the component, story, test and fixture but no Figma Code Connect file', () => {
    const root = makeMiniRoot();
    const result = runScaffold(root, ['Example', '--no-generate']);
    expect(result.status, result.stderr).toBe(0);

    const written = listFiles(root)
      .map((file) => relative(root, file).replace(/\\/g, '/'))
      .filter((file) => !file.startsWith('scripts/') && !file.startsWith('templates/'))
      .sort();

    expect(written).toEqual([
      'fixtures/swiss-canon/example-clean/expected.json',
      'fixtures/swiss-canon/example-clean/input.jsx',
      'public/hds-manifest.json',
      'src/app/components/example.test.tsx',
      'src/app/components/example.tsx',
      'src/stories/example.stories.tsx',
    ]);
  });

  it('does not plan a Code Connect write in --dry-run', () => {
    const root = makeMiniRoot();
    const result = runScaffold(root, ['Example', '--dry-run']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('would write component');
    expect(result.stdout).not.toMatch(/code-connect|\.figma\./i);
  });
});
