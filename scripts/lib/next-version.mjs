/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The version the pending changesets will release (hds#469), so
 * check-deprecations fails the PR whose changeset makes a `@removeIn` past due
 * instead of the later Version PR. Same arithmetic as `changeset version`:
 * the largest pending bump wins; a major from 0.x goes to 1.0.0. A pre-release
 * current version is returned as is (pre mode numbers its own releases).
 *
 * Pure apart from readPendingBumps, which only reads `.changeset/*.md`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseVersion } from '../../codemods/lib/semver.mjs';

const RANK = { patch: 1, minor: 2, major: 3 };
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

/** The bump a changeset's front matter gives `pkg`, or null. */
export function bumpOf(text, pkg) {
  const fm = FRONT_MATTER.exec(String(text))?.[1];
  if (!fm) return null;
  for (const line of fm.split(/\r?\n/)) {
    const m = /^\s*['"]?([^'":]+)['"]?\s*:\s*(major|minor|patch)\s*$/.exec(line);
    if (m && m[1].trim() === pkg) return m[2];
  }
  return null;
}

/** @param {string} current @param {string[]} bumps */
export function nextVersion(current, bumps) {
  const v = parseVersion(current);
  if (!v || v.prerelease.length) return current;
  const top = bumps.reduce((a, b) => ((RANK[b] ?? 0) > (RANK[a] ?? 0) ? b : a), null);
  if (top === 'major') return `${v.major + 1}.0.0`;
  if (top === 'minor') return `${v.major}.${v.minor + 1}.0`;
  if (top === 'patch') return `${v.major}.${v.minor}.${v.patch + 1}`;
  return current;
}

/** Every pending bump for `pkg` in `<root>/.changeset` (none when the dir is absent). */
export function readPendingBumps(root, pkg) {
  const dir = join(root, '.changeset');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => bumpOf(readFileSync(join(dir, f), 'utf-8'), pkg))
    .filter(Boolean);
}
