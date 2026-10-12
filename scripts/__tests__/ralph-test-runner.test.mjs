/**
 * ralph/test.sh — the test-only runner the kit's red-first check (ops#504)
 * runs inside a bare `git worktree` of the first test commit. It must reach a
 * real vitest there (no node_modules of its own) and run only the tests that
 * commit added, so "red" means the new test failed, not that pnpm was missing.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../../ralph/test.sh');

let dir;
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
const write = (root, rel, body) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ralph-test-sh-'));
  const main = join(dir, 'main');
  mkdirSync(main);
  git(main, 'init', '-q', '-b', 'main');
  git(main, 'config', 'user.email', 't@t');
  git(main, 'config', 'user.name', 't');
  mkdirSync(join(main, 'ralph'));
  copyFileSync(SCRIPT, join(main, 'ralph/test.sh'));
  chmodSync(join(main, 'ralph/test.sh'), 0o755);
  write(main, '.gitignore', 'node_modules\n');
  write(main, 'src/a.ts', 'export const a = 1;\n');
  git(main, 'add', '-A');
  git(main, 'commit', '-qm', 'base');
  // Fake vitest in the MAIN checkout only: logs its args, fails if FAKE_RED.
  write(
    main,
    'node_modules/.bin/vitest',
    '#!/usr/bin/env bash\necho "$@" > "$VITEST_LOG"\n[ -z "$FAKE_RED" ]\n',
  );
  chmodSync(join(main, 'node_modules/.bin/vitest'), 0o755);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

function commitAndWorktree(files) {
  const main = join(dir, 'main');
  for (const [rel, body] of Object.entries(files)) write(main, rel, body);
  git(main, 'add', '-A');
  git(main, 'commit', '-qm', 'test commit');
  const wt = join(dir, 'wt');
  git(main, 'worktree', 'add', '-q', '--detach', wt, 'HEAD');
  return wt;
}

function run(wt, env = {}) {
  const log = join(dir, 'vitest.log');
  const r = spawnSync('bash', [join(wt, 'ralph/test.sh')], {
    cwd: wt,
    encoding: 'utf8',
    env: { ...process.env, VITEST_LOG: log, FAKE_RED: '', ...env },
  });
  return {
    code: r.status,
    out: r.stdout + r.stderr,
    args: existsSync(log) ? readFileSync(log, 'utf8').trim() : null,
  };
}

describe('ralph/test.sh', () => {
  it('borrows the main checkout node_modules and runs only the commit’s tests', () => {
    const wt = commitAndWorktree({
      'tests/api/new.test.ts': 'x',
      'scripts/__tests__/b.test.mjs': 'x',
      'src/a.ts': 'export const a = 2;\n',
    });
    const r = run(wt);
    expect(r.code).toBe(0);
    expect(r.args).toBe('run scripts/__tests__/b.test.mjs tests/api/new.test.ts');
  });

  it('picks up hds vitest globs: contract .tsx and the ESLint plugin suites', () => {
    const wt = commitAndWorktree({
      'tests/primitive-contracts/box.contract.test.tsx': 'x',
      'scripts/eslint-plugin-hds/__tests__/rule.test.mjs': 'x',
    });
    const r = run(wt);
    expect(r.code).toBe(0);
    expect(r.args).toBe(
      'run scripts/eslint-plugin-hds/__tests__/rule.test.mjs tests/primitive-contracts/box.contract.test.tsx',
    );
  });

  it('exits non-zero (red) when the new test fails', () => {
    const wt = commitAndWorktree({ 'src/x.test.ts': 'x' });
    expect(run(wt, { FAKE_RED: '1' }).code).not.toBe(0);
  });

  it('runs nothing and exits non-zero when the commit has no vitest-run test file', () => {
    const wt = commitAndWorktree({ 'tests/layout.spec.ts': 'x' });
    const r = run(wt);
    expect(r.code).not.toBe(0);
    expect(r.args).toBeNull();
    expect(r.out).toMatch(/no vitest test file/);
  });
});
