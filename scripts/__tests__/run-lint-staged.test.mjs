/**
 * Regression for ops#493: `git commit -a` / `git commit <path>` must pass the
 * lint-staged step (it used to die with "Prevented an empty git commit!" and
 * leave a "lint-staged automatic backup" stash). Builds a throwaway repo whose
 * pre-commit hook runs the real scripts/run-lint-staged.mjs.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanLeftoverBackups } from '../run-lint-staged.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const runner = path.join(repoRoot, 'scripts', 'run-lint-staged.mjs');
const lintStagedBin = path.join(repoRoot, 'node_modules', '.bin', 'lint-staged');

let dir;
const cleanEnv = () => {
  const e = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
  for (const k of ['GIT_INDEX_FILE', 'GIT_DIR', 'GIT_WORK_TREE']) delete e[k];
  return e;
};
const git = (...args) => spawnSync('git', args, { cwd: dir, env: cleanEnv(), encoding: 'utf8' });
const out = (r) => `${r.stdout}${r.stderr}`;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-lint-staged-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 't@t.t');
  git('config', 'user.name', 't');
  // A no-op-ish task: lint-staged runs it on the staged file and nothing changes
  // (the "prettier made no change" shape from the ticket).
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ 'lint-staged': { '*.md': 'node -e 0' } }),
  );
  // `pnpm exec lint-staged` is shimmed to the repo's real lint-staged binary.
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(
    path.join(dir, 'bin', 'pnpm'),
    `#!/bin/sh\nshift\nshift\nexec "${lintStagedBin}" "$@"\n`,
    { mode: 0o755 },
  );
  fs.mkdirSync(path.join(dir, 'hooks'));
  fs.writeFileSync(
    path.join(dir, 'hooks', 'pre-commit'),
    `#!/bin/sh\nPATH="${path.join(dir, 'bin')}:$PATH" exec node ${runner}\n`,
    { mode: 0o755 },
  );
  git('config', 'core.hooksPath', 'hooks');
  fs.writeFileSync(path.join(dir, 'a.md'), '# a\n');
  fs.writeFileSync(path.join(dir, 'b.md'), '# b\n');
  git('add', '-A');
  git('-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'init');
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('pre-commit lint-staged runner (ops#493)', () => {
  it('commit -am succeeds and leaves no backup stash', () => {
    fs.appendFileSync(path.join(dir, 'a.md'), 'more\n');
    const r = git('commit', '-q', '-am', 'x');
    expect(out(r)).not.toMatch(/empty git commit|git error/);
    expect(r.status).toBe(0);
    expect(git('log', '--format=%s', '-1').stdout.trim()).toBe('x');
    expect(git('stash', 'list').stdout.trim()).toBe('');
  });

  it('commit <path> succeeds', () => {
    fs.appendFileSync(path.join(dir, 'b.md'), 'more\n');
    const r = git('commit', '-q', '-m', 'y', 'b.md');
    expect(r.status).toBe(0);
  });

  it('add + commit still succeeds', () => {
    fs.appendFileSync(path.join(dir, 'a.md'), 'more\n');
    git('add', 'a.md');
    const r = git('commit', '-q', '-m', 'z');

    expect(r.status).toBe(0);
  });

  it('still refuses a commit with nothing to commit', () => {
    expect(git('commit', '-q', '-am', 'empty').status).not.toBe(0);
  });

  it('drops a redundant leftover backup stash but keeps a differing one', () => {
    fs.appendFileSync(path.join(dir, 'a.md'), 'wip\n');
    const sha = git('stash', 'create', 'lint-staged automatic backup').stdout.trim();
    git('stash', 'store', '-m', 'lint-staged automatic backup (redundant)', sha);
    expect(cleanLeftoverBackups({ cwd: dir, env: cleanEnv() })).toEqual([sha]);
    expect(git('stash', 'list').stdout.trim()).toBe('');

    const sha2 = git('stash', 'create', 'lint-staged automatic backup').stdout.trim();
    git('stash', 'store', '-m', 'lint-staged automatic backup (differs)', sha2);
    fs.appendFileSync(path.join(dir, 'a.md'), 'newer\n');
    expect(cleanLeftoverBackups({ cwd: dir, env: cleanEnv() })).toEqual([]);
    expect(git('stash', 'list').stdout).toContain('differs');
  });
});
