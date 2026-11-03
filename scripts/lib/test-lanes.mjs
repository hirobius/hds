/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * test-lanes.mjs — the ONE selection helper for the split test gate (hds#1090).
 *
 * The full vitest suite is ~940s of wall time on a clean VM, and ~79% of it
 * is a handful of scripts/__tests__ integration files that spawn whole tools
 * per test case. So the gate has two lanes:
 *
 *   fast lane   `pnpm test:fast` — every test EXCEPT the heavy list
 *               (scripts/__tests__/heavy-files.txt). Target: ≤ 6 min wall.
 *   full lane   `pnpm test` / `pnpm test:full` — pretest + the whole suite,
 *               unchanged. It stops running on every push, not altogether.
 *
 * Both gate entry points call THIS module — scripts/lib/gate-tier.mjs
 * (pre-push full tier) imports planTestCommands(), and ralph/gate.sh runs
 * this file's CLI (`run` mode). Nobody copies the selection rules.
 *
 * Selection for a diff (planTestCommands):
 *   1. check:fast is the caller's business; this helper plans only the test
 *      stage. In lanes mode the stage is: pretest, the fast lane, then the
 *      triggered heavy subset. (Pretest is spelled out because `pnpm test`
 *      used to carry it implicitly via the npm lifecycle; lanes mode must
 *      not silently drop those 43 checkers.)
 *   2. Path-triggered heavy subsets — a diff runs the heavy files whose
 *      subject it touches:
 *        scripts/upgrade/**            → upgrade-* heavy files (+ check-upgrade-ledger)
 *        scripts/figma* or figma/**    → figma-* heavy files
 *        scripts/generate* / build-*   → generator-* / generate-* heavy files
 *        scripts/eslint-plugin-hds/**  → eslint-hds-self-lint
 *      Plus two subject rules that need no table: a changed heavy test file
 *      runs itself, and a changed scripts/<stem>.mjs runs
 *      scripts/__tests__/<stem>.test.mjs when that file is heavy-listed.
 *   3. Fail safe to the FULL suite when the diff touches the mechanism
 *      itself: the heavy list, either vitest config, this helper, or
 *      gate-tier.mjs. An unknown diff (null) is also full.
 *
 * Full-suite cadence: the fleet's overnight run executes `pnpm test` (full)
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
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

/** Paths that make the selection fail safe to the whole suite. */
export const FULL_SUITE_TRIGGERS = [
  HEAVY_LIST_PATH,
  'vitest.config.ts',
  'vitest.fast.config.ts',
  'scripts/lib/test-lanes.mjs',
  'scripts/lib/gate-tier.mjs',
];

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

/**
 * The test-stage commands for a diff.
 * @param {string[] | null} changedFiles null = unknown diff (fail safe: full)
 * @param {string[]} heavyFiles the heavy list
 * @returns {{ mode: 'full' | 'lanes', commands: string[], heavy: string[] }}
 */
export function planTestCommands(changedFiles, heavyFiles) {
  if (changedFiles == null || changedFiles.some((f) => FULL_SUITE_TRIGGERS.includes(f))) {
    return { mode: 'full', commands: ['pnpm test'], heavy: heavyFiles };
  }
  const heavy = triggeredHeavyFiles(changedFiles, heavyFiles);
  const commands = ['pnpm run pretest', 'pnpm test:fast'];
  if (heavy.length) {
    commands.push(`pnpm exec vitest run --passWithNoTests ${heavy.join(' ')}`);
  }
  return { mode: 'lanes', commands, heavy };
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
  const { mode: selection, commands, heavy } = planTestCommands(changed, readHeavyFiles());
  console.log(
    `test lanes: ${selection}${selection === 'lanes' ? ` (heavy subset: ${heavy.length ? heavy.join(', ') : 'none'})` : ''}`,
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
