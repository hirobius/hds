/**
 * preset.mjs — the theme keys of a Tailwind preset (hds#466), read the same
 * way by the CSS contract (scripts/lib/css-contract.mjs records the keys of
 * ./tailwind-preset per release) and by the upgrade command (which compares a
 * consumer's vendored copy with the preset it installs). Node builtins only:
 * it ships in the package with the upgrade command.
 */
import { createRequire } from 'node:module';

/** The exports key of the Tailwind theme preset. */
export const PRESET_EXPORT = './tailwind-preset';

/** The file name a consumer vendors the preset as (ops did): CommonJS, which loadPreset reads. */
export const VENDORED_PRESET = /(?:^|\/)tailwind\.config\.tokens\.c?js$/;

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Every leaf path of a theme object, dotted: a nested object is a group, anything else a key. */
function flattenKeys(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    isPlainObject(value) ? flattenKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

/**
 * The theme keys of a Tailwind preset module, flattened and sorted:
 * `colors.card.DEFAULT`, `spacing.4`. A tuple value (fontSize's
 * `[size, { lineHeight }]`) is one key. Reads `theme` and `theme.extend`
 * alike, so a preset that sets theme keys outright is read the same way.
 * @param {object} preset the module's export
 * @returns {string[]}
 */
export function themeKeys(preset) {
  const theme = isPlainObject(preset?.default?.theme) ? preset.default.theme : preset?.theme;
  if (!isPlainObject(theme)) return [];
  const { extend, ...rest } = theme;
  const keys = [...flattenKeys(rest), ...(isPlainObject(extend) ? flattenKeys(extend) : [])];
  return [...new Set(keys)].sort(byCodeUnit);
}

/** Loads a CommonJS preset fresh: a build that changed the file must not read a cached copy. */
export function loadPreset(file) {
  const require = createRequire(file);
  delete require.cache[require.resolve(file)];
  return require(file);
}

/**
 * The keys `copy` lacks and the keys it has that `installed` does not.
 * @param {string[]} copy
 * @param {string[]} installed
 */
export function presetDiff(copy, installed) {
  const [has, wants] = [new Set(copy), new Set(installed)];
  return {
    missing: installed.filter((key) => !has.has(key)),
    extra: copy.filter((key) => !wants.has(key)),
  };
}
