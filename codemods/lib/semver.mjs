/**
 * semver — the little of semver the upgrade command needs (hds#452), Node
 * builtins only. compareVersions is installed-version.mjs's, so the lockfile
 * readers and the command order versions the same way.
 */
import { compareVersions } from './installed-version.mjs';

export { compareVersions };

const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export const isVersion = (value) => typeof value === 'string' && VERSION.test(value);

/** One comparator: an optional operator and a full or partial version (`^0.16`, `0.16.0`). */
const SIMPLE = /^(\^|~|>=|=)?\s*v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(-[0-9A-Za-z.-]+)?$/;

/**
 * The range a package.json declares, moved to `target` with its operator kept:
 * `^0.16.0` → `^0.21.0`, `~0.16.2` → `~0.21.0`, `0.16.0` → `0.21.0`,
 * `>=0.16.0` → `>=0.21.0`; an `npm:` alias keeps its prefix. Null for a range
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
  return `${m[1] ?? ''}${target}`;
}

/**
 * Whether `range` already names `target` (bumpRange would leave it as it is).
 * @param {string} range
 * @param {string} target
 */
export const rangeIsAt = (range, target) => bumpRange(range, target) === range;
