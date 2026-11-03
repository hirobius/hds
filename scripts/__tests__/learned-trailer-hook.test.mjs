/**
 * ops#612: fix:/revert: commits carry a `Learned: <one line>` trailer; feat:
 * and other types are untouched. These cases run the real hook: a scratch git
 * repo gets hds's .husky/commit-msg, the quiet runner and the vendored check,
 * and `git commit` fires it, so git hands the message file over as $1 exactly
 * as it does in a real checkout. That covers the runner forwarding the hook's
 * arguments to each stage, which `sh -c <cmd>` alone does not do.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILES = [
  '.husky/commit-msg',
  'scripts/hook-run.mjs',
  'scripts/lib/hook-output.mjs',
  'scripts/check-learned-trailer.mjs',
];

let repo;

const git = (args, env = {}) =>
  spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, HOOK_VERBOSE: '', HOOK_RUN_RAW: '', ...env },
  });

const commit = (message, env) => git(['commit', '--allow-empty', '-q', '-m', message], env);

beforeAll(() => {
  repo = mkdtempSync(path.join(tmpdir(), 'hds-learned-trailer-'));
  for (const rel of FILES) {
    mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
    copyFileSync(path.join(ROOT, rel), path.join(repo, rel));
  }
  chmodSync(path.join(repo, '.husky/commit-msg'), 0o755);
  for (const args of [
    ['init', '-q', '-b', 'main'],
    ['config', 'user.email', 'test@example.invalid'],
    ['config', 'user.name', 'test'],
    ['config', 'commit.gpgsign', 'false'],
    ['config', 'core.hooksPath', '.husky'],
  ]) {
    expect(git(args).status).toBe(0);
  }
});

afterAll(() => {
  if (repo) rmSync(repo, { recursive: true, force: true });
});

describe('.husky/commit-msg Learned-trailer check (ops#612)', () => {
  it('blocks a fix: commit with no Learned: line', () => {
    const r = commit('fix: guard the empty case');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Learned: <one line>');
  });

  it('passes a fix: commit that carries a Learned: line', () => {
    const r = commit('fix: guard the empty case\n\nLearned: validate input at the seam');
    expect(r.stderr).not.toContain('✗');
    expect(r.status).toBe(0);
  });

  it('accepts Learned: none', () => {
    expect(commit('fix(x): typo\n\nLearned: none').status).toBe(0);
  });

  it('blocks a revert: commit with no Learned: line', () => {
    expect(commit('revert: undo the guard').status).toBe(1);
  });

  it('leaves a feat: commit alone', () => {
    expect(commit('feat: add a thing').status).toBe(0);
  });

  it('behaves the same with HOOK_VERBOSE=1 (the raw path)', () => {
    expect(commit('fix: no trailer', { HOOK_VERBOSE: '1' }).status).toBe(1);
    expect(commit('fix: trailer\n\nLearned: none', { HOOK_VERBOSE: '1' }).status).toBe(0);
  });

  it('is wired as a named stage that reads the message file from $1', () => {
    const hook = readFileSync(path.join(ROOT, '.husky/commit-msg'), 'utf8');
    expect(hook).toContain('node scripts/check-learned-trailer.mjs "$1"');
    expect(hook).toMatch(/exec node scripts\/hook-run\.mjs "\$\(basename "\$0"\)" "\$@"/);
  });
});
