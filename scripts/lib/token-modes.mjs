/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Token mode reader — the one place that knows where theme/density modes live.
 *
 * hirobius.tokens.json stores per-mode values at
 * `$extensions['com.figma.variables'].modes.{Light,Dark,Compact}`
 * (build-tokens V4/V5 enforce the namespace and capitalisation). Two exporters
 * once read a retired `com.hirobius.*` modes key instead, so every Figma "Dark"
 * value silently equalled Light. Read modes through these helpers, never by
 * spelling the extension path inline.
 */

export const MODES_NAMESPACE = 'com.figma.variables';

/**
 * Returns the token's mode map (e.g. `{ Light, Dark }`), or null when the token
 * declares no modes.
 *
 * @param {object | undefined} extensions  A token's `$extensions` object.
 * @returns {Record<string, unknown> | null}
 */
export function readModes(extensions) {
  const modes = extensions?.[MODES_NAMESPACE]?.modes;
  return modes && typeof modes === 'object' ? modes : null;
}

/**
 * The value a token takes in `mode`, falling back to its `$value` when the
 * token has no value for that mode.
 *
 * @param {{ value: unknown, extensions?: object }} token  A walkTokens() leaf.
 * @param {string} mode  'Light' | 'Dark' | 'Compact'
 */
export function modeValue(token, mode) {
  return readModes(token.extensions)?.[mode] ?? token.value;
}
