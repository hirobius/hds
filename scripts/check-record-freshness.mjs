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
 *   2. Changeset presence — a pushed commit touching src/ needs either a
 *      pending changeset file (.changeset/*.md, excluding README.md) or a
 *      `skip-changeset` marker in its own commit message. Otherwise a source
 *      change ships with no release note and CHANGELOG.md goes stale exactly
 *      the way hds#249 found it (last touched two months before two ADRs and
 *      a wave of commits landed).
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
const CHANGESET_PREFIXES = ['src/'];
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
 * @typedef {{ sha: string, date: string, message: string, files: string[] }} Commit
 */

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

/**
 * @param {Commit[]} commits
 * @param {string} statusUpdatedAt - ISO date/datetime from status.json
 */
export function checkStatusFreshness(commits, statusUpdatedAt) {
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
    if (!commit.files.some((f) => touchesWatchedPath(f, CHANGESET_PREFIXES))) continue;
    if (hasPending) continue;
    if (SKIP_MARKER.test(commit.message)) continue;
    offenders.push(commit);
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
    return `${upstream}..HEAD`;
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
    log = git(['log', `--format=%H${FIELD_SEP}%cI${FIELD_SEP}%B${COMMIT_SEP}`, range]);
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
      return { sha, date, message: message ?? '', files };
    });
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
        `  fix: update status.json (updatedAt, phase, headline, next, blocked) to reflect this ` +
        `push, per CLAUDE.md, then amend/include it in what you push.`,
    );
  }

  const pending = loadPendingChangesets();
  const changesetResult = checkChangesetPresence(commits, pending);
  if (!changesetResult.ok) {
    hadFailure = true;
    console.error(
      `✗ check-record-freshness — ${changesetResult.offenders.length} pushed commit(s) touch ` +
        `src/ with no pending changeset and no "skip-changeset" marker in the commit message:`,
    );
    for (const commit of changesetResult.offenders) {
      console.error(`    ${commit.sha.slice(0, 8)}  ${commit.message.split('\n')[0]}`);
    }
    console.error(
      '  fix: run `pnpm changeset` and commit the generated .changeset/*.md file, or add ' +
        '"skip-changeset" to the commit message if this genuinely needs no release note.',
    );
  }

  if (hadFailure) process.exit(1);
  console.log(`✓ check-record-freshness — status.json and changesets are current (${range}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
