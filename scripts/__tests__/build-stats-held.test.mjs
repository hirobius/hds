// @vitest-environment node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The `size` and `tests` blocks of public/hds-stats.json (hds#1385). Neither can
 * be re-measured in pretest (one needs a library build, the other lists every
 * test), so they are held like `delivery`: counted only by `--size` / `--tests`,
 * from a clean commit on main, and kept by every other run. These tests pin the
 * committed blocks' shape and sum, and the rule that a refresh which cannot
 * measure truthfully keeps the committed block.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectSize,
  collectTests,
  countPlaywrightList,
  countVitestList,
  HELD_BLOCKS,
  MAIN_ENTRY,
  mainHeld,
  mainKbOf,
  measuredCommit,
  STATS_PATH,
} from '../build-stats-json.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/build-stats-json.mjs');
const committed = JSON.parse(readFileSync(join(ROOT, STATS_PATH), 'utf8'));
const SHA = /^[0-9a-f]{40}$/;

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
  vi.restoreAllMocks();
});
const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

describe('committed tests block', () => {
  const { tests } = committed;

  it('has exactly unit, e2e, visual, total and asOf', () => {
    expect(Object.keys(tests)).toEqual(['unit', 'e2e', 'visual', 'total', 'asOf']);
    for (const key of ['unit', 'e2e', 'visual', 'total']) {
      expect(Number.isInteger(tests[key]), key).toBe(true);
      expect(tests[key], key).toBeGreaterThan(0);
    }
    expect(tests.asOf).toMatch(SHA);
  });

  it('total is unit + e2e + visual', () => {
    expect(tests.unit + tests.e2e + tests.visual).toBe(tests.total);
  });
});

describe('committed size block', () => {
  const { size } = committed;

  it('has exactly mainKb and asOf, in kB with two decimals', () => {
    expect(Object.keys(size)).toEqual(['mainKb', 'asOf']);
    expect(size.mainKb).toBeGreaterThan(0);
    expect(Math.round(size.mainKb * 100) / 100).toBe(size.mainKb);
    expect(size.asOf).toMatch(SHA);
  });

  it('reads the one size-limit entry .size-limit.cjs names "main entry graph"', () => {
    const entries = createRequire(import.meta.url)(join(ROOT, '.size-limit.cjs'));
    expect(entries.filter((e) => e.name.startsWith(MAIN_ENTRY))).toHaveLength(1);
  });
});

describe('mainKbOf', () => {
  const json = (size) =>
    JSON.stringify([
      { name: 'tokens graph (token bridge constants)', size: 4540 },
      { name: `${MAIN_ENTRY} (hirobius-ui.js + the modules it re-exports)`, size },
    ]);

  it('takes the main entry in kB (bytes / 1000), two decimals', () => {
    expect(mainKbOf(json(52734))).toBe(52.73);
    expect(mainKbOf(json(52735))).toBe(52.74);
  });

  it('is null without that entry, without a size, or on text that is not JSON', () => {
    expect(mainKbOf(JSON.stringify([{ name: 'tokens graph', size: 1 }]))).toBeNull();
    expect(mainKbOf(JSON.stringify([{ name: MAIN_ENTRY }]))).toBeNull();
    expect(mainKbOf('')).toBeNull();
    expect(mainKbOf('size-limit: dist not found')).toBeNull();
  });
});

describe('collectSize', () => {
  const run = () => JSON.stringify([{ name: MAIN_ENTRY, size: 52730 }]);

  it('names the commit it measured', () => {
    expect(collectSize(ROOT, { commit: 'a'.repeat(40), run })).toEqual({
      mainKb: 52.73,
      asOf: 'a'.repeat(40),
    });
  });

  it('measures nothing off a clean commit on main, or without a build, and says why', () => {
    const err = quiet();
    expect(collectSize(ROOT, { commit: null, run })).toBeNull();
    expect(collectSize(ROOT, { commit: 'a'.repeat(40), run: () => null })).toBeNull();
    expect(err.mock.calls.map((c) => c[0]).join('\n')).toMatch(
      /size not refreshed: .*origin\/main[\s\S]*size not refreshed: .*pnpm build:lib/,
    );
  });
});

describe('counting the test lists', () => {
  it('counts one test per entry of `vitest list --json`', () => {
    expect(
      countVitestList(
        JSON.stringify([
          { name: 'a > one', file: 'a.test.ts' },
          { name: 'a > two', file: 'a.test.ts' },
        ]),
      ),
    ).toBe(2);
  });

  it('counts nothing from an empty or broken vitest list', () => {
    expect(countVitestList('[]')).toBeNull();
    expect(countVitestList('')).toBeNull();
    expect(countVitestList('Error: config failed')).toBeNull();
  });

  it('reads the Total line of `playwright test --list`', () => {
    expect(
      countPlaywrightList('Listing tests:\n  a.spec.ts:3:1 › x\nTotal: 212 tests in 9 files\n'),
    ).toBe(212);
    expect(countPlaywrightList('Listing tests:\nTotal: 1 test in 1 file\n')).toBe(1);
    expect(countPlaywrightList('Listing tests:\nTotal: 0 tests in 0 files\n')).toBe(0);
  });

  it('counts nothing when playwright printed no Total line or did not run', () => {
    expect(countPlaywrightList('Error: ENOENT: no such file or directory, scandir …')).toBeNull();
    expect(countPlaywrightList(null)).toBeNull();
  });
});

describe('collectTests', () => {
  const vitest = JSON.stringify(
    Array.from({ length: 7 }, (_, i) => ({ name: `t${i}`, file: 'f' })),
  );
  const list = {
    unit: () => vitest,
    e2e: () => 'Total: 3 tests in 2 files\n',
    visual: () => 'Total: 5 tests in 1 file\n',
  };
  const commit = 'b'.repeat(40);

  it('sums the three lanes and names the commit it counted', () => {
    expect(collectTests(ROOT, { commit, list })).toEqual({
      unit: 7,
      e2e: 3,
      visual: 5,
      total: 15,
      asOf: commit,
    });
  });

  it('counts nothing off a clean commit on main', () => {
    quiet();
    expect(collectTests(ROOT, { commit: null, list })).toBeNull();
  });

  it('counts nothing when one lane cannot be listed: a partial total is a wrong number', () => {
    const err = quiet();
    expect(collectTests(ROOT, { commit, list: { ...list, unit: () => null } })).toBeNull();
    expect(collectTests(ROOT, { commit, list: { ...list, e2e: () => null } })).toBeNull();
    expect(collectTests(ROOT, { commit, list: { ...list, visual: () => 'Error' } })).toBeNull();
    expect(err).toHaveBeenCalledTimes(3);
  });
});

// ── git ───────────────────────────────────────────────────────────────────────
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@example.com',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@example.com',
};
const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', env: GIT_ENV }).trim();

/** A repo with one commit on origin/main that holds a stats file and a source file. */
function repo(stats = {}) {
  const root = mkdtempSync(join(tmpdir(), 'hds-held-'));
  temps.push(root);
  git(root, 'init', '-q', '-b', 'main');
  mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(join(root, STATS_PATH), JSON.stringify(stats));
  writeFileSync(join(root, 'a.ts'), 'export const a = 1;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'chore: first');
  git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  return root;
}

describe('measuredCommit', () => {
  it('is HEAD on a clean checkout of a commit on main', () => {
    const root = repo();
    expect(measuredCommit(root)).toBe(git(root, 'rev-parse', 'HEAD'));
  });

  it('still is when only the stats file changed, or an untracked file sits there', () => {
    const root = repo();
    writeFileSync(join(root, STATS_PATH), '{"x":1}');
    writeFileSync(join(root, 'notes.txt'), 'scratch');
    expect(measuredCommit(root)).toBe(git(root, 'rev-parse', 'HEAD'));
  });

  it('is null when a tracked file changed: the count would not be that commit', () => {
    const root = repo();
    writeFileSync(join(root, 'a.ts'), 'export const a = 2;\n');
    expect(measuredCommit(root)).toBeNull();
  });

  it('is null on a branch commit that main does not have', () => {
    const root = repo();
    writeFileSync(join(root, 'a.ts'), 'export const a = 2;\n');
    git(root, 'commit', '-q', '-am', 'feat: on a branch');
    expect(measuredCommit(root)).toBeNull();
  });

  it('is null without origin/main and outside a git checkout', () => {
    const root = repo();
    git(root, 'update-ref', '-d', 'refs/remotes/origin/main');
    expect(measuredCommit(root)).toBeNull();
    const bare = mkdtempSync(join(tmpdir(), 'hds-held-nogit-'));
    temps.push(bare);
    expect(measuredCommit(bare)).toBeNull();
  });
});

describe('mainHeld', () => {
  it('reads any held block committed on origin/main, for a working file that lost it', () => {
    const size = { mainKb: 52.73, asOf: 'a'.repeat(40) };
    const root = repo({ size });
    writeFileSync(join(root, STATS_PATH), '{}');
    expect(mainHeld(root, 'size')).toEqual(size);
    expect(mainHeld(root, 'tests')).toBeUndefined();
  });
});

// ── CLI ───────────────────────────────────────────────────────────────────────
const INPUTS = [
  'src/index.ts',
  'src/patterns.ts',
  'hirobius.tokens.json',
  'public/hds-manifest.json',
  'docs/data/consumer-usage.json',
  'docs/sync-map.json',
  'package.json',
  STATS_PATH,
];
function copyRoot() {
  const root = mkdtempSync(join(tmpdir(), 'hds-stats-held-'));
  temps.push(root);
  for (const f of INPUTS) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    cpSync(join(ROOT, f), join(root, f));
  }
  return root;
}
const run = (root, ...args) =>
  spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });

describe('held blocks through the CLI', () => {
  it('lists delivery, size and tests as held', () => {
    expect(HELD_BLOCKS).toEqual(['delivery', 'size', 'tests']);
  });

  it('a plain run and --check keep the committed size and tests blocks', () => {
    const root = copyRoot();
    const before = readFileSync(join(root, STATS_PATH), 'utf8');
    expect(run(root, '--check').status).toBe(0);
    expect(run(root).status).toBe(0);
    expect(readFileSync(join(root, STATS_PATH), 'utf8')).toBe(before);
  });

  it('--check does not re-measure: a held block is provenance, like generatedFrom', () => {
    const root = copyRoot();
    const file = join(root, STATS_PATH);
    const stats = JSON.parse(readFileSync(file, 'utf8'));
    stats.size = { ...stats.size, asOf: 'c'.repeat(40) };
    writeFileSync(file, `${JSON.stringify(stats, null, 2)}\n`);
    expect(run(root, '--check').status).toBe(0);
  });

  it('--size and --tests outside a clean commit on main keep the blocks and say why', () => {
    const root = copyRoot(); // a temp dir: no git, so no commit to name
    const before = readFileSync(join(root, STATS_PATH), 'utf8');
    const res = run(root, '--size', '--tests');
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('size not refreshed');
    expect(res.stderr).toContain('tests not refreshed');
    expect(readFileSync(join(root, STATS_PATH), 'utf8')).toBe(before);
  });

  it('a file with no held blocks gets none from a refresh that cannot measure', () => {
    const root = copyRoot();
    writeFileSync(join(root, STATS_PATH), '{}\n');
    expect(run(root, '--size', '--tests').status).toBe(0);
    const out = JSON.parse(readFileSync(join(root, STATS_PATH), 'utf8'));
    expect(out).not.toHaveProperty('size');
    expect(out).not.toHaveProperty('tests');
  });
});
