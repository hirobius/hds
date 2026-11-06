/**
 * Data for the Icons foundation gallery (hds#1229). The list comes from the
 * `@hirobius/design-system/icons` export itself, so a new icon shows up on the
 * docs page with no docs edit.
 */

/** A React component export: a function, or a forwardRef/memo object. */
const isComponent = (value: unknown): boolean =>
  typeof value === 'function' ||
  (typeof value === 'object' && value !== null && '$$typeof' in value);

/** Every component name an icons module exports, sorted A–Z. */
export function iconNames(mod: Record<string, unknown>): string[] {
  return Object.keys(mod)
    .filter((name) => /^[A-Z]/.test(name) && isComponent(mod[name]))
    .sort((a, b) => a.localeCompare(b));
}

const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');

/** Names that contain the query, ignoring case, spaces, dashes and underscores. */
export function filterIconNames(names: readonly string[], query: string): string[] {
  const q = normalize(query);
  return q ? names.filter((name) => normalize(name).includes(q)) : [...names];
}
