/**
 * semver — the little of semver the upgrade tooling needs (hds#452, hds#642),
 * Node builtins only (it imports nothing): this file ships in the npm package.
 *
 * It is the one place versions are parsed and ordered. The upgrade ledger, its
 * compiler and gate, the deprecation gate and the shipped `upgrade` codemod all
 * order releases through compareVersions, so a pre-release sorts the same way
 * in each: semver.org precedence (§11).
 *
 *   compareVersions('0.21.0-next.2', '0.21.0-next.10')  // -1: numeric identifiers
 *   compareVersions('0.21.0-next-1', '0.21.0-next-2')   // -1: one alphanumeric identifier
 *   compareVersions('0.21.0-next.1', '0.21.0')          // -1: a release follows its pre-releases
 *
 * A version here is `X.Y.Z` or `X.Y.Z-<dot-separated identifiers>`; build
 * metadata (`+build`) and partial versions are not versions.
 */

const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const NUMERIC = /^\d+$/;

/**
 * A version's parts, or null when `text` is not a version. Numeric pre-release
 * identifiers come back as numbers, the rest as strings.
 * @param {unknown} text
 * @returns {{ major: number, minor: number, patch: number, prerelease: (string|number)[] } | null}
 */
export function parseVersion(text) {
  const match = typeof text === 'string' ? VERSION.exec(text) : null;
  if (!match) return null;
  const [, major, minor, patch, pre] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease:
      pre === undefined ? [] : pre.split('.').map((id) => (NUMERIC.test(id) ? Number(id) : id)),
  };
}

export const isVersion = (value) => parseVersion(value) !== null;

const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** §11: numbers compare as numbers, text in ASCII order, and a number is lower than text. */
function compareIdentifiers(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return order(a, b);
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;
  return order(a, b);
}

function need(text) {
  const version = parseVersion(text);
  if (version === null) {
    throw new TypeError(
      `Not a version: ${JSON.stringify(text)} (expected X.Y.Z or X.Y.Z-pre.release)`,
    );
  }
  return version;
}

/**
 * -1, 0 or 1 by semver.org precedence. A pre-release is lower than its own
 * release (0.21.0-next.1 < 0.21.0); between pre-releases the identifiers
 * compare one by one, and with all of them equal the longer set is higher.
 * Throws a TypeError for anything that is not a version: ordering a guess
 * would sort a bad value silently.
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
export function compareVersions(a, b) {
  const x = need(a);
  const y = need(b);
  for (const part of ['major', 'minor', 'patch']) {
    if (x[part] !== y[part]) return order(x[part], y[part]);
  }
  const xs = x.prerelease;
  const ys = y.prerelease;
  // A release (no identifiers) is higher than any pre-release of it.
  if (xs.length === 0 || ys.length === 0) return order(ys.length, xs.length);
  for (let i = 0; i < Math.min(xs.length, ys.length); i += 1) {
    const result = compareIdentifiers(xs[i], ys[i]);
    if (result !== 0) return result;
  }
  return order(xs.length, ys.length);
}

/** Whether `a` is after `b`. */
export const gt = (a, b) => compareVersions(a, b) > 0;

/** Whether `a` is `b` or after it. */
export const gte = (a, b) => compareVersions(a, b) >= 0;

/** One comparator: an optional operator and a full or partial version (`^0.16`, `0.16.0`). */
const SIMPLE = /^(\^|~|>=|=)?\s*v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(-[0-9A-Za-z.-]+)?$/;

/**
 * The range a package.json declares, moved to `target` with its operator kept:
 * `^0.16.0` → `^0.21.0`, `~0.16.2` → `~0.21.0`, `0.16.0` → `0.21.0`,
 * `>=0.16.0` → `>=0.21.0`; an x-range or partial version keeps its wildcard
 * (`0.16.x` → `0.21.x`, `0.x` stays); an `npm:` alias keeps its prefix. Null for a range
 * it cannot move safely (`workspace:*`, `latest`, a compound range, a URL).
 * @param {string} range
 * @param {string} target
 * @returns {string|null}
 */
export function bumpRange(range, target) {
  const alias = /^(npm:(?:@[^@/\s]+\/)?[^@\s]+@)(.*)$/.exec(range);
  if (alias) {
    const inner = bumpRange(alias[2], target);
    return inner === null ? null : `${alias[1]}${inner}`;
  }
  const m = SIMPLE.exec(range.trim());
  if (!m) return null;
  const [, op = '', maj, min, pat, pre] = m;
  const wild = (part) => part === undefined || part === 'x' || part === '*';
  if (op === '' && (wild(min) || wild(pat))) {
    // An x-range or a partial version (`0.16.x`, `0.x`, `0.16`) stays a
    // wildcard of the same shape, so the consumer keeps getting patches.
    if (pre) return null;
    const [tMaj, tMin] = target.split('.');
    const parts = [tMaj];
    if (min !== undefined) parts.push(wild(min) ? min : tMin);
    // Here a patch part is a wildcard, or follows one (`0.x.x`): keep it.
    if (pat !== undefined) parts.push(pat);
    return parts.join('.');
  }
  if (op === '=' && (wild(min) || wild(pat))) return null;
  return `${op}${target}`;
}

/**
 * Whether `range` already names `target` (bumpRange would leave it as it is).
 * @param {string} range
 * @param {string} target
 */
export const rangeIsAt = (range, target) => bumpRange(range, target) === range;
