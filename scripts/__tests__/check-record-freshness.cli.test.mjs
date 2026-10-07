/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * CLI-integration canary for hds#249 — proves check-record-freshness.mjs
 * actually reads real git history and status.json, not just its in-memory
 * pure functions (see check-record-freshness.test.mjs for those).
 *
 * Builds a disposable git repo under a tmp dir (not this worktree — a real
 * push-time gate must not be exercised against the session's own working
 * tree, which would make the test's outcome depend on whether the session
 * remembered to bump status.json before running it).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = path.join(REPO_ROOT, 'scripts', 'check-record-freshness.mjs');

let dir;

// Strip GIT_* vars: under a pre-push hook (esp. from a worktree) git exports
// GIT_DIR/GIT_INDEX_FILE etc., which would redirect every command here into
// the real repo — committing junk and rewriting its .git/config.
const CLEAN_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
);

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: CLEAN_ENV }).trim();
}

function commitAll(cwd, message, env = {}) {
  git(['add', '-A'], cwd);
  execFileSync('git', ['commit', '-m', message, '--no-verify'], {
    cwd,
    encoding: 'utf8',
    env: { ...CLEAN_ENV, ...env },
  });
}

beforeAll(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'check-record-freshness-'));
  git(['init', '-q'], dir);
  git(['config', 'user.email', 'test@example.com'], dir);
  git(['config', 'user.name', 'Test'], dir);

  mkdirSync(path.join(dir, 'src'), { recursive: true });
  mkdirSync(path.join(dir, '.changeset'), { recursive: true });
  writeFileSync(path.join(dir, '.changeset', 'README.md'), '# changesets\n');
  writeFileSync(
    path.join(dir, 'status.json'),
    JSON.stringify({ updatedAt: '2020-01-01T00:00:00Z' }, null, 2),
  );
  commitAll(dir, 'chore: initial commit');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function runGate(range) {
  try {
    const stdout = execFileSync(process.execPath, [GATE, '--range', range], {
      cwd: dir,
      encoding: 'utf8',
      env: CLEAN_ENV,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

describe('check-record-freshness CLI', () => {
  it('passes when the range has no commits touching watched paths', () => {
    writeFileSync(path.join(dir, 'README.md'), 'hello\n');
    commitAll(dir, 'docs: readme');
    const result = runGate('HEAD~1..HEAD');
    expect(result.status).toBe(0);
  });

  it('fails when a src/ commit outpaces a stale status.json, and names the fix', () => {
    writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
    commitAll(dir, 'feat: add a', {
      GIT_COMMITTER_DATE: '2030-01-01T00:00:00Z',
      GIT_AUTHOR_DATE: '2030-01-01T00:00:00Z',
    });

    const result = runGate('HEAD~1..HEAD');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/status\.json is stale/);
    expect(result.stderr).toMatch(/status\.json/);
  });

  it('also fails on the same commit for missing changeset, and passes once one is added', () => {
    // Bring status.json current so only the changeset check is exercised.
    writeFileSync(
      path.join(dir, 'status.json'),
      JSON.stringify({ updatedAt: '2031-01-01T00:00:00Z' }, null, 2),
    );
    commitAll(dir, 'chore(status): bump');

    writeFileSync(path.join(dir, 'src', 'b.ts'), 'export const b = 2;\n');
    commitAll(dir, 'feat: add b');

    const missingChangeset = runGate('HEAD~1..HEAD');
    expect(missingChangeset.status).not.toBe(0);
    expect(missingChangeset.stderr).toMatch(/no pending changeset/);

    writeFileSync(
      path.join(dir, '.changeset', 'brave-lions-jump.md'),
      '---\n"@hirobius/design-system": patch\n---\n\nAdd b.\n',
    );
    commitAll(dir, 'chore: changeset');

    const withChangeset = runGate('HEAD~2..HEAD');
    expect(withChangeset.status).toBe(0);
  });

  it('a skip-changeset marker in the commit message is accepted with no pending changeset', () => {
    writeFileSync(path.join(dir, 'src', 'c.ts'), 'export const c = 3;\n');
    commitAll(dir, 'fix: tiny\n\nskip-changeset');

    const result = runGate('HEAD~1..HEAD');
    expect(result.status).toBe(0);
  });

  it('a .status/ note in the range replaces the updatedAt bump; the stale record still fails without one', () => {
    writeFileSync(
      path.join(dir, 'status.json'),
      JSON.stringify({ updatedAt: '2020-01-01T00:00:00Z' }, null, 2),
    );
    commitAll(dir, 'chore(status): back to stale');
    writeFileSync(path.join(dir, 'src', 'd.ts'), 'export const d = 4;\n');
    commitAll(dir, 'fix: d\n\nskip-changeset', {
      GIT_COMMITTER_DATE: '2032-01-01T00:00:00Z',
      GIT_AUTHOR_DATE: '2032-01-01T00:00:00Z',
    });

    const stale = runGate('HEAD~1..HEAD');
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toMatch(/status\.json is stale/);
    expect(stale.stderr).toMatch(/\.status\//);

    mkdirSync(path.join(dir, '.status'), { recursive: true });
    writeFileSync(path.join(dir, '.status', 'claude-d.md'), 'Added d.\n');
    commitAll(dir, 'chore(status): note');

    expect(runGate('HEAD~2..HEAD').status).toBe(0);
  });
});

describe('check-record-freshness CLI: package.json (hds#448)', () => {
  let repo;
  const writePkg = (pkg) =>
    writeFileSync(path.join(repo, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  const run = (range) => {
    try {
      execFileSync(process.execPath, [GATE, '--range', range], {
        cwd: repo,
        encoding: 'utf8',
        env: CLEAN_ENV,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { status: 0, stderr: '' };
    } catch (error) {
      return { status: error.status ?? 1, stderr: error.stderr ?? '' };
    }
  };
  const pkg = {
    name: '@hirobius/design-system',
    version: '0.20.0',
    dependencies: { clsx: '^2.1.1', 'date-fns': '^4.1.0' },
    scripts: { test: 'vitest run' },
  };

  beforeAll(() => {
    repo = mkdtempSync(path.join(os.tmpdir(), 'check-record-freshness-pkg-'));
    git(['init', '-q'], repo);
    git(['config', 'user.email', 'test@example.com'], repo);
    git(['config', 'user.name', 'Test'], repo);
    mkdirSync(path.join(repo, '.changeset'), { recursive: true });
    writeFileSync(path.join(repo, '.changeset', 'README.md'), '# changesets\n');
    writeFileSync(
      path.join(repo, 'status.json'),
      JSON.stringify({ updatedAt: '2099-01-01T00:00:00Z' }, null, 2),
    );
    writePkg(pkg);
    commitAll(repo, 'chore: initial commit');
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('a package.json edit to scripts alone needs no changeset', () => {
    writePkg({ ...pkg, scripts: { ...pkg.scripts, lint: 'eslint .' } });
    commitAll(repo, 'chore: lint script');
    expect(run('HEAD~1..HEAD').status).toBe(0);
  });

  it('a dropped dependency needs a changeset, and the message names the field', () => {
    writePkg({ ...pkg, dependencies: { clsx: '^2.1.1' }, scripts: { test: 'vitest run' } });
    commitAll(repo, 'chore(deps): drop date-fns');
    const result = run('HEAD~1..HEAD');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/package\.json dependencies/);
    expect(result.stderr).toMatch(/pnpm upgrade:note/);
  });
});
