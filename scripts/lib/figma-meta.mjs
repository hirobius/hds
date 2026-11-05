/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — the Figma library's meta variables (Hirobius/Meta).
 *
 * Facts about the package, not tokens: the library cover binds them, a push
 * writes them, check:figma-drift names each one that differs, and
 * check:figma-release refuses a release whose meta Figma does not show yet.
 * Every value is read from the repo, never the clock or a hand edit, so the
 * same commit always builds the same values:
 *
 *   meta/version     package.json "version"
 *   meta/releasedAt  that version's date: upgrade/releases/<version>.json,
 *                    else its CHANGELOG.md heading, else the date of the
 *                    commit that set the version in package.json
 *   meta/commit      short SHA (7) of the last commit that changed what the
 *                    library is synced from (SYNCED_INPUTS)
 *   meta/docsUrl     package.json "homepage"
 *   meta/repoUrl     package.json "repository" as a browsable https URL
 *   meta/npmName     package.json "name"
 *
 * A value that cannot be read (no package.json, no git, as in fixture
 * mini-roots) is left out, and so is its variable. In a shallow clone
 * (actions/checkout fetches depth 1) the oldest commit present looks like it
 * added every file, so when the last synced-input commit is that boundary
 * meta/commit is unknowable and is left out too: deepenSyncedHistory first.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { META_FIELDS } from './figma-model.mjs';

export { META_FIELDS };

/** Files whose content reaches the Figma model: their last commit is meta/commit. */
export const SYNCED_INPUTS = Object.freeze([
  'hirobius.tokens.json',
  'figma/brand-modes.json',
  'directions',
  'package.json',
]);

const SHORT_SHA = 7;

/** `git+https://host/o/r.git`, `git@host:o/r.git` or `{ url }` → `https://host/o/r`. */
export function browsableRepoUrl(repository) {
  const raw = typeof repository === 'string' ? repository : repository?.url;
  if (!raw) return null;
  const url = String(raw)
    .replace(/^git\+/, '')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '');
  return /^https?:\/\//.test(url) ? url : null;
}

/** `## 0.32.0 (2026-10-24)` or `## [0.32.0] - 2026-10-24` → the date, else null. */
export function changelogDate(text, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(
    `^##\\s+\\[?${escaped}(?![\\w.])\\]?[^\\n]*?(\\d{4}-\\d{2}-\\d{2})`,
    'm',
  );
  return text.match(heading)?.[1] ?? null;
}

/** Runs git in `root`; returns trimmed stdout, or null on any failure. */
export function runGit(root, args) {
  try {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : null;
  } catch {
    return null;
  }
}

/**
 * The last commit to SYNCED_INPUTS. `complete` is false when that commit is a
 * shallow-clone boundary (no parents present), where git cannot tell whether
 * it really changed the inputs: a depth-1 checkout always names HEAD.
 * @returns {{ sha: string, complete: boolean } | null}  null without git.
 */
export function syncedInputsCommit(root, { git = runGit } = {}) {
  const sha = git(root, ['log', '-1', '--format=%H', '--', ...SYNCED_INPUTS]);
  if (!sha) return null;
  if (git(root, ['rev-parse', '--is-shallow-repository']) !== 'true') {
    return { sha, complete: true };
  }
  const line = git(root, ['rev-list', '--parents', '-n', '1', sha]) ?? sha;
  return { sha, complete: line.split(/\s+/).length > 1 };
}

/**
 * Fetches the full history of a shallow clone so meta/commit can be read.
 * No-op on a full clone. Talks to the remote: callers are release gates only.
 * @returns {boolean} true when the history is complete afterwards.
 */
export function deepenSyncedHistory(root) {
  if (runGit(root, ['rev-parse', '--is-shallow-repository']) !== 'true') return true;
  spawnSync('git', ['fetch', '--unshallow', '--quiet'], { cwd: root, stdio: 'ignore' });
  return runGit(root, ['rev-parse', '--is-shallow-repository']) === 'false';
}

function releaseDate(root, version, git) {
  const ledger = join(root, 'upgrade', 'releases', `${version}.json`);
  if (existsSync(ledger)) {
    const { date } = JSON.parse(readFileSync(ledger, 'utf8'));
    if (/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return date;
  }
  const changelog = join(root, 'CHANGELOG.md');
  if (existsSync(changelog)) {
    const date = changelogDate(readFileSync(changelog, 'utf8'), version);
    if (date) return date;
  }
  // The oldest commit whose package.json holds this version: the one that set it.
  const out = git(root, [
    'log',
    '--format=%cs',
    '--reverse',
    '-S',
    `"version": "${version}"`,
    '--',
    'package.json',
  ]);
  return out ? out.split('\n')[0] : null;
}

/**
 * The meta values for `root`, keyed as META_FIELDS; unreadable ones are absent.
 * @param {string} root
 * @param {{ git?: (root: string, args: string[]) => string|null }} [options]  git: injectable for tests.
 * @returns {Record<string, string>}
 */
export function readFigmaMeta(root, { git = runGit } = {}) {
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return {};
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const synced = syncedInputsCommit(root, { git });
  const sha = synced?.complete ? synced.sha : null;
  const meta = {
    version: pkg.version ?? null,
    releasedAt: pkg.version ? releaseDate(root, pkg.version, git) : null,
    commit: sha ? sha.slice(0, SHORT_SHA) : null,
    docsUrl: pkg.homepage ?? null,
    repoUrl: browsableRepoUrl(pkg.repository),
    npmName: pkg.name ?? null,
  };
  return Object.fromEntries(
    Object.entries(meta).filter(([, v]) => typeof v === 'string' && v.length > 0),
  );
}

/**
 * Figma's meta values in a snapshot, keyed as META_FIELDS: each variable matched by
 * the path a push stamps (`meta.<key>`), else by name (`meta/<key>`), as hdsMatch does.
 */
export function snapshotMeta(snapshot) {
  const all = snapshot.collections.flatMap((c) => c.variables);
  const out = {};
  for (const { key } of META_FIELDS) {
    const v =
      all.find((x) => x.path === `meta.${key}`) ?? all.find((x) => x.name === `meta/${key}`);
    const entry = v && Object.values(v.valuesByMode ?? {})[0];
    if (typeof entry?.value === 'string') out[key] = entry.value;
  }
  return out;
}

/**
 * Expected (code) vs actual (Figma) for every meta value code sets.
 * @returns {Array<{ key: string, name: string, expected: string, actual: string|null, ok: boolean }>}
 */
export function metaGaps(expected, snapshot) {
  const actual = snapshotMeta(snapshot);
  return META_FIELDS.filter(({ key }) => key in expected).map(({ key }) => ({
    key,
    name: `meta/${key}`,
    expected: expected[key],
    actual: actual[key] ?? null,
    ok: actual[key] === expected[key],
  }));
}
