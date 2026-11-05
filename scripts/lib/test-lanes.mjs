/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * test-lanes.mjs — the ONE test-selection helper for the push gates (hds#1090).
 *
 * The full vitest suite is ~8,500 tests and 15–50 min of wall time, ~79% of
 * it a handful of scripts/__tests__ integration files that spawn whole tools
 * per test case. A push does not need all of it, so there are three lanes:
 *
 *   affected    what a push runs: pretest (the cheap --check generators) plus
 *               only the tests the diff can reach — `vitest related` over the
 *               changed files (the import graph), plus every test file that
 *               NAMES a changed file (tests that spawn a script or read a data
 *               file by path never import it, so the graph misses them), plus
 *               the path-triggered heavy subset (AREA_RULES). Target ≤ 6 min.
 *   fast        `pnpm test:fast` — everything EXCEPT the heavy list
 *               (scripts/__tests__/heavy-files.txt). On demand only.
 *   full        `pnpm test:full` (= `pnpm test`: pretest + the whole suite).
 *               Runs before release (`pnpm release:local` → check:release),
 *               nightly, and on any push whose diff trips needsFullSuite().
 *
 * Both gate entry points call THIS module — scripts/lib/gate-tier.mjs
 * (pre-push full tier) imports planTestCommands(), and ralph/gate.sh runs
 * this file's CLI (`run` mode). Nobody copies the selection rules.
 *
 * Safety fallback (needsFullSuite → full lane): a diff that touches shared
 * config (package.json, lockfile, tsconfig, vite/eslint config), tokens
 * (token JSON, src/styles|tokens|theme), generators (scripts/generate-* and
 * build-*), the test setup, or the gate mechanism itself (heavy list, vitest
 * configs, this helper, gate-tier, the pre-push hook and its scripts). Those
 * reach tests through paths neither the import graph nor a name scan sees.
 * An unknown diff (null) is also full.
 *
 * Full-suite cadence: the fleet's overnight run executes `pnpm test:full`
 * once nightly, locally — GitHub Actions is off, so there is no CI nightly;
 * when Actions returns, this becomes a CI nightly job and this note is the
 * pointer. The daily gate-timing collection re-measures per-file durations:
 * a fast-lane file over 10s per-file wall in two consecutive collections
 * moves to heavy-files.txt in the same PR that reports it.
 *
 * CLI (for ralph/gate.sh and humans):
 *   node scripts/lib/test-lanes.mjs plan [--files a,b,c]  print the commands
 *   node scripts/lib/test-lanes.mjs run  [--files a,b,c]  run them, fail closed
 * Without --files, the diff is merge-base(HEAD, origin/main)...HEAD.
 *
 * @module test-lanes
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(import.meta.dirname ?? dirname(fileURLToPath(import.meta.url)), '../..');

/** Repo-relative path of the heavy list. */
export const HEAVY_LIST_PATH = 'scripts/__tests__/heavy-files.txt';

/**
 * Parse heavy-files.txt: one path per line, first token wins (so a trailing
 * `# 112.3s` measurement note is fine), blank lines and `#` lines ignored.
 * @param {string} text raw file content
 * @returns {string[]} repo-relative test paths, in file order
 */
export function parseHeavyFiles(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.split(/\s+/)[0]);
}

/** @param {string} [root] repo root (defaults to this repo) */
export function readHeavyFiles(root = ROOT) {
  return parseHeavyFiles(readFileSync(join(root, HEAVY_LIST_PATH), 'utf8'));
}

/**
 * Paths that make the selection fail safe to the whole suite: they reach
 * tests through routes neither `vitest related` nor the name scan can see.
 */
export const FULL_SUITE_PATTERNS = [
  // The gate mechanism itself.
  new RegExp(`^${HEAVY_LIST_PATH.replace(/[.]/g, '\\.')}$`),
  /^vitest(\.fast)?\.config\.[^/]+$/,
  /^scripts\/lib\/(test-lanes|gate-tier)\.mjs$/,
  /^scripts\/(pre-push-gate|hook-run)\.mjs$/,
  /^scripts\/hooks\//,
  /^\.husky\//,
  /^tests\/setup\//,
  // Shared config.
  /^package\.json$/,
  /^pnpm-(lock|workspace)\.yaml$/,
  /^tsconfig[^/]*\.json$/,
  /^vite\.config[^/]*$/,
  /^eslint\.config\.[^/]+$/,
  // Tokens.
  /^hirobius\.tokens\.json$/,
  /^tokens\.lock\.json$/,
  /^tailwind\.config[^/]*$/,
  /^src\/(styles|tokens|theme)\//,
  // Generators.
  /^scripts\/(generate|build)-[^/]+$/,
];

/**
 * The first changed path that forces the full suite, or null.
 * @param {string[]} changedFiles
 * @returns {string | null}
 */
export function needsFullSuite(changedFiles) {
  return changedFiles.find((f) => FULL_SUITE_PATTERNS.some((re) => re.test(f))) ?? null;
}

/** Vitest's include globs (vitest.config.ts), as a predicate. Playwright specs are not ours. */
const TEST_FILE_PATTERNS = [
  /^scripts\/__tests__\/.+\.(test|spec)\.mjs$/,
  /^scripts\/eslint-plugin-hds\/__tests__\/.+\.test\.mjs$/,
  /^src\/.+\.(test|spec)\.(ts|tsx|js|jsx)$/,
  /^tests\/.+\.test\.(ts|tsx)$/,
];
export const isTestFile = (f) => TEST_FILE_PATTERNS.some((re) => re.test(f));

/** Directories that hold vitest test files (roots of TEST_FILE_PATTERNS). */
const TEST_ROOTS = ['scripts/__tests__', 'scripts/eslint-plugin-hds/__tests__', 'src', 'tests'];
const SKIP_DIRS = new Set(['node_modules', 'fixtures', '__snapshots__', 'dist', 'coverage']);

/**
 * Every vitest test file with its text, for the name scan.
 * @param {string} [root] repo root
 * @returns {Array<[string, string]>} [repo-relative path, file text]
 */
export function readTestIndex(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(abs);
        continue;
      }
      const rel = relative(root, abs).split('\\').join('/');
      if (isTestFile(rel)) out.push([rel, readFileSync(abs, 'utf8')]);
    }
  };
  for (const r of TEST_ROOTS) walk(join(root, r));
  return out;
}

/** Basenames too generic to scan for: they would select half the suite. */
const GENERIC_BASENAMES = new Set([
  'index',
  'types',
  'utils',
  'constants',
  'package',
  'readme',
  'changelog',
]);

/**
 * Test files a diff reaches by name: a changed test file selects itself, and
 * any other changed file selects every test whose text contains its basename
 * (`check-css-integrity.mjs`, `state-surfaces.json`). This catches tests that
 * spawn a script or read a data file — no import, so `vitest related` misses them.
 * @param {string[]} changedFiles
 * @param {Array<[string, string]>} testIndex from readTestIndex()
 * @returns {string[]} sorted test paths
 */
export function referencingTests(changedFiles, testIndex) {
  const hit = new Set();
  for (const file of changedFiles) {
    if (isTestFile(file)) {
      hit.add(file);
      continue;
    }
    const name = basename(file);
    const stem = name.replace(/\.[^.]+$/, '').toLowerCase();
    if (GENERIC_BASENAMES.has(stem) || stem.length < 4) continue;
    for (const [test, text] of testIndex) if (text.includes(name)) hit.add(test);
  }
  return [...hit].sort();
}

/**
 * Area rules: [changed-path pattern, heavy-file predicate]. The predicates
 * match against the heavy list itself, so a file that leaves the list (or a
 * newly listed file with a matching name) needs no rule edit.
 */
const AREA_RULES = [
  [/^scripts\/upgrade\//, (h) => /(^|\/)(upgrade-|check-upgrade-ledger)/.test(h)],
  [/^scripts\/figma|^figma\//, (h) => /(^|\/)figma-/.test(h)],
  [/^scripts\/(generate|build)-/, (h) => /(^|\/)(generator-|generate-)/.test(h)],
  [/^scripts\/eslint-plugin-hds\//, (h) => /(^|\/)eslint-hds-self-lint\./.test(h)],
];

/**
 * Which heavy files a diff triggers.
 * @param {string[]} changedFiles repo-relative changed paths
 * @param {string[]} heavyFiles the heavy list
 * @returns {string[]} triggered heavy files, in heavy-list order
 */
export function triggeredHeavyFiles(changedFiles, heavyFiles) {
  const hit = new Set();
  for (const file of changedFiles) {
    for (const [pattern, matches] of AREA_RULES) {
      if (pattern.test(file)) for (const h of heavyFiles) if (matches(h)) hit.add(h);
    }
    // A changed heavy test runs itself.
    if (heavyFiles.includes(file)) hit.add(file);
    // A changed scripts/<stem>.mjs runs its heavy-listed test, if one exists.
    const subject = /^scripts\/([^/]+)\.mjs$/.exec(file);
    if (subject) {
      const test = `scripts/__tests__/${subject[1]}.test.mjs`;
      if (heavyFiles.includes(test)) hit.add(test);
    }
  }
  return heavyFiles.filter((h) => hit.has(h));
}

const CODE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx)$/;

/**
 * The test-stage commands for a diff.
 * @param {string[] | null} changedFiles null = unknown diff (fail safe: full)
 * @param {string[]} heavyFiles the heavy list
 * @param {Array<[string, string]>} [testIndex] from readTestIndex(), for the name scan
 * @returns {{ mode: 'full' | 'affected', reason: string, commands: string[], tests: string[] }}
 */
export function planTestCommands(changedFiles, heavyFiles, testIndex = []) {
  const trigger = changedFiles == null ? 'diff unknown' : needsFullSuite(changedFiles);
  if (trigger) {
    return { mode: 'full', reason: trigger, commands: ['pnpm test'], tests: [] };
  }
  const tests = [
    ...new Set([
      ...referencingTests(changedFiles, testIndex),
      ...triggeredHeavyFiles(changedFiles, heavyFiles),
    ]),
  ];
  const sources = changedFiles.filter((f) => CODE_EXT.test(f) && !isTestFile(f));
  const commands = ['pnpm run pretest'];
  // One vitest process: `related` runs the tests importing `sources`, and a
  // test file passed to it runs itself.
  const args = [...sources, ...tests];
  if (args.length)
    commands.push(`pnpm exec vitest related --run --passWithNoTests ${args.join(' ')}`);
  return { mode: 'affected', reason: `${changedFiles.length} file(s)`, commands, tests };
}

/** Changed paths vs origin/main, or null when git can't answer. */
function gitChangedFiles() {
  const git = (...a) =>
    execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    const base = git('merge-base', 'HEAD', 'origin/main').trim();
    return git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

/** CLI: `plan` prints the test-stage commands; `run` executes them in order. */
export function main(argv) {
  const mode = argv[0] ?? 'plan';
  const filesFlag = argv.indexOf('--files');
  const changed =
    filesFlag >= 0 ? argv[filesFlag + 1].split(',').filter(Boolean) : gitChangedFiles();
  const {
    mode: selection,
    reason,
    commands,
    tests,
  } = planTestCommands(changed, readHeavyFiles(), changed ? readTestIndex() : []);
  console.log(
    `test lanes: ${selection} (${reason})${selection === 'affected' ? ` — ${tests.length} named test file(s) + vitest related` : ''}`,
  );
  for (const cmd of commands) {
    console.log(`$ ${cmd}`);
    if (mode !== 'run') continue;
    const r = spawnSync('sh', ['-c', cmd], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) return r.status ?? 1;
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
