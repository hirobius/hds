/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * next-version.mjs — the version the pending changesets will ship as.
 *
 * check-deprecations used to compare `@removeIn` only against the current
 * package version, so it went red on the Version PR — one release too late
 * for the PR that caused it (hds#469). Reading the pending changesets'
 * bumps instead makes a PR whose own changeset pushes a removal past due
 * fail on that PR.
 *
 * Pure: callers hand in changeset texts; no fs here.
 */

const RANK = { patch: 1, minor: 2, major: 3 };

/**
 * The bump one changeset's frontmatter declares for `packageName`, or null
 * when it does not name the package. Frontmatter is the `---` block at the
 * top: `'@hirobius/design-system': minor`.
 * @param {string} text a .changeset/*.md file
 * @param {string} packageName
 * @returns {'major'|'minor'|'patch'|null}
 */
export function changesetBump(text, packageName) {
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(String(text ?? ''));
  if (!frontmatter) return null;
  for (const line of frontmatter[1].split('\n')) {
    const m = /^['"]?([^'":]+?)['"]?\s*:\s*(major|minor|patch)\s*$/.exec(line.trim());
    if (m && m[1] === packageName) return m[2];
  }
  return null;
}

/**
 * `current` bumped by the strongest of `bumps` (changesets semantics: the
 * highest bump wins). Null when there is nothing pending.
 * @param {string} current an X.Y.Z version
 * @param {Array<string|null>} bumps
 * @returns {string|null}
 */
export function nextVersion(current, bumps) {
  const real = bumps.filter(Boolean);
  if (!real.length) return null;
  const top = real.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
  const [x, y, z] = current.split('.').map(Number);
  if (top === 'major') return `${x + 1}.0.0`;
  if (top === 'minor') return `${x}.${y + 1}.0`;
  return `${x}.${y}.${z + 1}`;
}
