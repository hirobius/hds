/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * ranges.mjs — does a new version range drop a version the old one accepted?
 * (hds#448). A narrowed peer range or raised engines forces a consumer to
 * upgrade something else first, so the upgrade gate reads it as breaking.
 *
 * Only the range forms package.json uses here are read: `^x`, `~x`, `>=x`,
 * an exact `x` and `*`, joined with `||`; a missing minor or patch reads as 0.
 * Anything else (a hyphen range, `<`, two comparators in one alternative, a
 * pre-release or a tag) is unread, and an unread range counts as narrowed, so a
 * person writes the step and decides. No dependency: codemods and the gate
 * share Node builtins only.
 */

const INFINITE = [Infinity, 0, 0, 0];

/** `18`, `1.3`, `1.3.0` as [major, minor, patch, 0]; null for anything else. */
function parseVersion(text) {
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(text);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0), 0];
}

function compare(a, b) {
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}

/** One alternative as a half-open interval [lo, hi), or null when unread. */
function interval(alternative) {
  const text = alternative.trim();
  if (text === '*' || text === 'x' || text === '') return { lo: [0, 0, 0, 0], hi: INFINITE };
  const match = /^(\^|~|>=|=)?\s*(\S+)$/.exec(text);
  if (!match) return null;
  const [, op = '=', rest] = match;
  const v = parseVersion(rest);
  if (!v) return null;
  const [major, minor, patch] = v;
  switch (op) {
    case '>=':
      return { lo: v, hi: INFINITE };
    case '^':
      if (major > 0) return { lo: v, hi: [major + 1, 0, 0, 0] };
      if (minor > 0) return { lo: v, hi: [0, minor + 1, 0, 0] };
      return { lo: v, hi: [0, 0, patch + 1, 0] };
    case '~':
      return { lo: v, hi: [major, minor + 1, 0, 0] };
    default:
      // An exact version: the interval holding only it.
      return { lo: v, hi: [major, minor, patch, 1] };
  }
}

/** Every alternative of a range, or null when any of them is unread. */
function intervals(range) {
  if (typeof range !== 'string') return null;
  const parts = range.split('||').map(interval);
  return parts.every(Boolean) ? parts : null;
}

/**
 * True when some version `from` accepts is outside `to`, or when either range
 * is unread.
 * @param {string} from the range before the change
 * @param {string} to the range after it
 */
export function narrows(from, to) {
  const before = intervals(from);
  const after = intervals(to);
  if (!before || !after) return true;
  return !before.every((old) =>
    after.some((now) => compare(now.lo, old.lo) <= 0 && compare(old.hi, now.hi) <= 0),
  );
}
