#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-record-freshness.mjs — hds#249
 *
 * ADR-010 retired docs/SYSTEMS-LOG.md (an auto-generated "append-only
 * ledger" that was not wired to any commit hook and duplicated git history)
 * and named its replacement: git history + CHANGELOG.md + ADRs. That
 * replacement then went stale the same way — CLAUDE.md has required a
 * status.json bump "before ending any session that changed project state"
 * since it was written, and nothing enforced it, so it held only when
 * someone remembered. This gate is the enforcement, not a new ledger
 * (explicitly out of scope per hds#249's "Deliberately not in scope").
 *
 * Two checks, both scoped to the commits this push is about to publish (the
 * range between the upstream tracking branch and HEAD; falls back to just
 * HEAD when there is no upstream — a fresh branch's first push):
 *
 *   1. status.json freshness — a pushed commit touching src/, scripts/, or
 *      docs/adr/ must be no newer than status.json's `updatedAt`. Wired to
 *      pre-push, not pre-commit: mid-branch commits should not each demand a
 *      status bump, but a push is a state change the fleet dashboard renders.
 *   2. Changeset presence — a pushed commit that changes what ships to
 *      consumers needs either a pending changeset file (.changeset/*.md,
 *      excluding README.md) or a `skip-changeset` marker in its own commit
 *      message. Otherwise the change ships with no release note (and, since
 *      hds#448, no upgrade note) and CHANGELOG.md goes stale exactly the way
 *      hds#249 found it (last touched two months before two ADRs and a wave
 *      of commits landed). What ships (hds#448): anything under src/; the
 *      shipped code beside it, which is what package.json#files lists under
 *      codemods/, mcp/ and scripts/eslint-plugin-hds/ (codemods/lib/ does
 *      not ship; tests and fixtures left out); hirobius.tokens.json and
 *      tailwind.config.tokens.cjs; and package.json, but only the fields a
 *      consumer installs or resolves (CONSUMER_PACKAGE_FIELDS: dependencies,
 *      peers, engines, exports, bin, files and the like). A scripts or
 *      devDependencies edit is tooling, and `version` is the release itself,
 *      so neither asks for a changeset. 0.20.0 dropped five runtime
 *      dependencies with only package.json changed, which src/ alone missed.
 *
 * Usage:
 *   node scripts/check-record-freshness.mjs
 *   node scripts/check-record-freshness.mjs --range <rev>..<rev>   # explicit range
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ROOT is the git worktree containing CWD, not this script's own location
// (the usual `path.resolve(dirname(import.meta.url), '..')` pattern other
// gates use). This gate's own CLI-integration test runs it against a
// disposable throwaway repo to prove the git wiring without touching this
// session's real status.json / .changeset — that only works if ROOT follows
// the caller's cwd. No-op for normal in-place use: `git rev-parse
// --show-toplevel` from within this repo resolves to this repo.
function findRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  }
}

const ROOT = findRoot();
const STATUS_PATH = path.join(ROOT, 'status.json');
const CHANGESET_DIR = path.join(ROOT, '.changeset');

const WATCHED_PREFIXES = ['src/', 'scripts/', 'docs/adr/'];
/**
 * Directories of shipped code beside src/. Not all of each ships (codemods/lib/
 * serves the upgrade command in this repo), so package.json#files says which
 * of their files do.
 */
const SHIPPED_CODE_DIRS = ['codemods/', 'mcp/', 'scripts/eslint-plugin-hds/'];
/** Single files whose change reaches consumers through the build. */
const CHANGESET_FILES = ['hirobius.tokens.json', 'tailwind.config.tokens.cjs'];
/** Beside shipped code but never shipped: tests, fixtures, prose. */
const NOT_SHIPPED = [
  /(^|\/)(__tests__|__fixtures__|fixtures?)\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /\.md$/i,
];
/**
 * package.json fields a consumer installs or resolves. Everything else
 * (scripts, devDependencies, lint and size config) is tooling, and `version`
 * is written by `changeset version` itself.
 */
export const CONSUMER_PACKAGE_FIELDS = [
  'name',
  'type',
  'main',
  'module',
  'types',
  'typings',
  'browser',
  'exports',
  'imports',
  'bin',
  'files',
  'sideEffects',
  'dependencies',
  'optionalDependencies',
  'bundleDependencies',
  'bundledDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'engines',
];
const SKIP_MARKER = /skip-changeset/i;

// ── pure logic (unit-tested against in-memory fixtures) ───────────────────

/**
 * @param {string} file - a repo-relative path
 * @param {string[]} prefixes
 */
export function touchesWatchedPath(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix));
}

/**
 * The package.json#files entries under SHIPPED_CODE_DIRS, read from this
 * tree; the whole directories when package.json cannot be read or has no
 * `files` (npm then packs everything).
 * @returns {string[]}
 */
function readShippedCode() {
  try {
    const { files } = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (!Array.isArray(files)) return SHIPPED_CODE_DIRS;
    return files.filter((entry) => touchesWatchedPath(entry, SHIPPED_CODE_DIRS));
  } catch {
    return SHIPPED_CODE_DIRS;
  }
}

let shippedCode = null;

/**
 * True when `file` is `entry` of package.json#files or under it: a file, a
 * directory (with or without a trailing slash) or a glob (`*`, `**`, `?`).
 */
export function matchesFilesEntry(file, entry) {
  const clean = entry.replace(/^\.\//, '').replace(/\/+$/, '');
  if (!/[*?]/.test(clean)) return file === clean || file.startsWith(`${clean}/`);
  const source = clean
    .split(/(\*\*|\*|\?)/)
    .map((part) =>
      part === '**'
        ? '.*'
        : part === '*'
          ? '[^/]*'
          : part === '?'
            ? '[^/]'
            : part.replace(/[.+^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${source}(?:/.*)?$`).test(file);
}

/**
 * True when a change to `file` ships to consumers. src/ counts whole, as it
 * always has, and so do the token files; beside src/, a file ships when
 * package.json#files lists it (`shipped`), leaving out tests, fixtures and
 * prose.
 * @param {string} file - a repo-relative path
 * @param {string[]} [shipped] - package.json#files entries under codemods/,
 *   mcp/ and scripts/eslint-plugin-hds/ (default: this tree's)
 */
export function shipsToConsumers(file, shipped = (shippedCode ??= readShippedCode())) {
  if (file.startsWith('src/')) return true;
  if (CHANGESET_FILES.includes(file)) return true;
  if (!shipped.some((entry) => matchesFilesEntry(file, entry))) return false;
  return !NOT_SHIPPED.some((pattern) => pattern.test(file));
}

/** JSON with object keys sorted, so a reordered map compares equal. */
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * The CONSUMER_PACKAGE_FIELDS that differ between two package.json objects.
 * A side that could not be read (null) differs in every field it would hold,
 * reported as `(unreadable)`.
 * @param {object | null} before
 * @param {object | null} after
 */
export function consumerPackageChanges(before, after) {
  if (!before || !after) return ['(unreadable)'];
  return CONSUMER_PACKAGE_FIELDS.filter((field) => stable(before[field]) !== stable(after[field]));
}

/**
 * @typedef {{ sha: string, date: string, message: string, files: string[],
 *   packageFields?: string[] }} Commit
 * `packageFields`: the CONSUMER_PACKAGE_FIELDS the commit changed in
 * package.json (empty or absent when it changed none).
 */

/** Why a commit needs a changeset: shipped files, then package.json fields. */
export function changesetReasons(commit) {
  return [
    ...commit.files.filter((file) => shipsToConsumers(file)),
    ...(commit.packageFields ?? []).map((field) => `package.json ${field}`),
  ];
}

/**
 * Newest commit (by ISO `date`) that touches any of `prefixes`, or null.
 * @param {Commit[]} commits
 * @param {string[]} prefixes
 */
export function newestTouching(commits, prefixes) {
  let newest = null;
  for (const commit of commits) {
    if (!commit.files.some((f) => touchesWatchedPath(f, prefixes))) continue;
    if (!newest || commit.date > newest.date) newest = commit;
  }
  return newest;
}

/** A per-PR status note: `.status/<name>.md` (not the README, not nested). */
export function isStatusNote(file) {
  return /^\.status\/[^/]+\.md$/.test(file) && file.toLowerCase() !== '.status/readme.md';
}

/** True when any pushed commit adds/changes a status note. */
export function hasStatusNote(commits) {
  return commits.some((c) => c.files.some(isStatusNote));
}

/**
 * A `.status/*.md` note in the pushed range counts as a fresh record (it is
 * folded into status.json later by `pnpm status:fold`), so PRs need not edit
 * status.json and stop conflicting on it.
 * @param {Commit[]} commits
 * @param {string} statusUpdatedAt - ISO date/datetime from status.json
 */
export function checkStatusFreshness(commits, statusUpdatedAt) {
  if (hasStatusNote(commits)) return { ok: true };
  const newest = newestTouching(commits, WATCHED_PREFIXES);
  if (!newest) return { ok: true };
  // Compare as ISO strings when both are comparable that way; status.json's
  // updatedAt in this repo is a full RFC3339 instant, commit dates from `git
  // log --format=%cI` are too, so lexicographic compare is a valid instant
  // compare for same-format ISO-8601 strings.
  if (newest.date > statusUpdatedAt) {
    return { ok: false, newest };
  }
  return { ok: true };
}

/**
 * @param {Commit[]} commits
 * @param {string[]} pendingChangesetFiles - basenames under .changeset/, minus README.md
 */
export function checkChangesetPresence(commits, pendingChangesetFiles) {
  const hasPending = pendingChangesetFiles.length > 0;
  const offenders = [];
  for (const commit of commits) {
    const reasons = changesetReasons(commit);
    if (reasons.length === 0) continue;
    if (hasPending) continue;
    if (SKIP_MARKER.test(commit.message)) continue;
    offenders.push({ ...commit, reasons });
  }
  return { ok: offenders.length === 0, offenders };
}

// ── git / fs plumbing ───────────────────────────────────────────────────────

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function resolveRange(explicitRange) {
  if (explicitRange) return explicitRange;
  try {
    const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    return `${upstream}..HEAD ^origin/main`;
  } catch {
    // No upstream configured (first push of a new branch) — check the tip
    // commit only, which is the one case guaranteed to be about to publish.
    return 'HEAD~1..HEAD';
  }
}

const COMMIT_SEP = '\u0001';
const FIELD_SEP = '\u0002';

/** @returns {Commit[]} */
function loadCommits(range) {
  let log;
  try {
    // `^origin/main` (default range only) skips commits main already holds, so
    // merging or cherry-picking from main never re-demands a status bump.
    log = git([
      'log',
      `--format=%H${FIELD_SEP}%cI${FIELD_SEP}%B${COMMIT_SEP}`,
      ...range.split(' '),
    ]);
  } catch {
    return [];
  }
  if (!log) return [];
  return log
    .split(COMMIT_SEP)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [sha, date, message] = chunk.split(FIELD_SEP);
      let files = [];
      try {
        files = git(['diff-tree', '--no-commit-id', '--name-only', '-r', sha])
          .split('\n')
          .filter(Boolean);
      } catch {
        files = [];
      }
      const packageFields = files.includes('package.json') ? packageFieldsOf(sha) : [];
      return { sha, date, message: message ?? '', files, packageFields };
    });
}

/** package.json at `rev`, parsed; null when absent or not JSON. */
function packageJsonAt(rev) {
  try {
    return JSON.parse(git(['show', `${rev}:package.json`]));
  } catch {
    return null;
  }
}

/** The consumer fields commit `sha` changed in package.json (a root commit: every field it has). */
function packageFieldsOf(sha) {
  const after = packageJsonAt(sha);
  let before = packageJsonAt(`${sha}^`);
  if (!before && after) {
    try {
      git(['rev-parse', '--verify', '--quiet', `${sha}^`]);
    } catch {
      before = {}; // a root commit adds package.json whole
    }
  }
  return consumerPackageChanges(before, after);
}

function loadPendingChangesets() {
  if (!existsSync(CHANGESET_DIR)) return [];
  return readdirSync(CHANGESET_DIR).filter(
    (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md',
  );
}

function main() {
  const args = process.argv.slice(2);
  const rangeIdx = args.indexOf('--range');
  const explicitRange = rangeIdx >= 0 ? args[rangeIdx + 1] : undefined;

  const range = resolveRange(explicitRange);
  const commits = loadCommits(range);

  if (commits.length === 0) {
    console.log(`✓ check-record-freshness — no commits in range ${range}`);
    process.exit(0);
  }

  if (!existsSync(STATUS_PATH)) {
    console.error(`✗ check-record-freshness — status.json is missing at ${STATUS_PATH}`);
    process.exit(1);
  }
  const status = JSON.parse(readFileSync(STATUS_PATH, 'utf8'));

  let hadFailure = false;

  const statusResult = checkStatusFreshness(commits, status.updatedAt);
  if (!statusResult.ok) {
    hadFailure = true;
    console.error(
      `✗ check-record-freshness — status.json is stale.\n` +
        `  commit ${statusResult.newest.sha.slice(0, 8)} (${statusResult.newest.date}) touches ` +
        `src/, scripts/ or docs/adr/, but status.json's updatedAt is ${status.updatedAt}.\n` +
        `  fix: add a one-line note .status/<branch>.md (never conflicts; \`pnpm status:fold\` ` +
        `folds notes into status.json on main), or run \`pnpm status:touch\` to bump status.json directly.`,
    );
  }

  const pending = loadPendingChangesets();
  const changesetResult = checkChangesetPresence(commits, pending);
  if (!changesetResult.ok) {
    hadFailure = true;
    console.error(
      `✗ check-record-freshness — ${changesetResult.offenders.length} pushed commit(s) change ` +
        `what ships to consumers with no pending changeset and no "skip-changeset" marker in ` +
        `the commit message:`,
    );
    for (const commit of changesetResult.offenders) {
      const shown = commit.reasons.slice(0, 3).join(', ');
      const more = commit.reasons.length > 3 ? ` and ${commit.reasons.length - 3} more` : '';
      console.error(`    ${commit.sha.slice(0, 8)}  ${commit.message.split('\n')[0]}`);
      console.error(`              (${shown}${more})`);
    }
    console.error(
      '  fix: run `pnpm changeset`, then `pnpm upgrade:note` for its upgrade/pending/*.json, ' +
        'and commit both; or add "skip-changeset" to the commit message if this genuinely ' +
        'needs no release note.',
    );
  }

  if (hadFailure) process.exit(1);
  console.log(`✓ check-record-freshness — status.json and changesets are current (${range}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
