/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The duration custom properties the prefers-reduced-motion block must zero,
 * derived from hirobius.tokens.json (hds#751): every primitive.duration.* token,
 * and the --hds-motion-<role>-duration of every semantic.motion composite that
 * carries a duration. A new duration token is covered without a code change.
 */
const isToken = (key) => !key.startsWith('$');

export function requiredDurationVars(tokens) {
  const primitive = Object.keys(tokens.primitive?.duration ?? {})
    .filter(isToken)
    .map((name) => `--primitive-duration-${name}`);
  const roles = Object.entries(tokens.semantic?.motion ?? {})
    .filter(([key, token]) => isToken(key) && token?.$value?.duration !== undefined)
    .map(([role]) => `--hds-motion-${role}-duration`);
  return [...primitive, ...roles];
}
