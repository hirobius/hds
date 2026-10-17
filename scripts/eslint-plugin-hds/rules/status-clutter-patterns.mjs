/**
 * Shared patterns for hds/no-status-clutter and its repo-wide twin,
 * scripts/check-no-status-clutter.mjs (hds#759): one place to add a tone.
 * Each matches one class token, with any variant prefix (`dark:`, `md:`).
 */

/** A left-border bar, 2 to 8px. */
export const BAR = /^(?:[\w-]+:)*border-l-(?:[2-8]|\[[2-8]px\])$/;

/** A tone-coloured border. */
export const TONE_COLOUR =
  /^(?:[\w-]+:)*border-(?:l-)?(?:feedback-[\w-]+|accent[\w-]*|primary[\w-]*|info|success|warning|danger|blue-[\w-]+)$/;

export const ROUND = /^(?:[\w-]+:)*rounded-full$/;

/** 12px or less. */
export const SMALL = /^(?:[\w-]+:)*(?:size|h|w)-(?:0\.5|1|1\.5|2|2\.5|3|\[(?:[1-9]|1[0-2])px\])$/;

/** A feedback or hue fill, with an optional `/opacity`. */
export const TONE_FILL =
  /^(?:[\w-]+:)*bg-(?:feedback-[\w-]+|(?:success|warning|danger|info|error|destructive)[\w-]*|(?:green|red|amber|yellow|emerald|lime|orange|rose)-\d+|\[(?:color:)?var\(--[^)]*(?:feedback|success|warning|danger|error|info)[^)]*\)\])(?:\/\d+)?$/;

/** Something wider than a dot: padding, a full width or a flex grow. */
export const WIDE = /^(?:[\w-]+:)*(?:px-|w-full$|flex-1$|min-w-)/;

/** A `status-dot` / `hds-dot` class. */
export const DOT_CLASS = /^(?:[\w-]+:)*[\w-]+-dot$/;

/** A filled-circle glyph or emoji used as a status mark. Not `•`, a bullet separator. */
export const STATUS_GLYPH = /[●⬤◉🟢🟡🔴🟠🔵🟣]/u;

/** True when one class list paints a small round tone-coloured dot or carries a `*-dot` class. */
export function isDotClassList(tokens) {
  if (tokens.some((t) => DOT_CLASS.test(t))) return true;
  return (
    tokens.some((t) => ROUND.test(t)) &&
    tokens.some((t) => SMALL.test(t)) &&
    tokens.some((t) => TONE_FILL.test(t))
  );
}

/** True when one class list is a coloured left accent bar. */
export function isAccentBarClassList(tokens) {
  return tokens.some((t) => BAR.test(t)) && tokens.some((t) => TONE_COLOUR.test(t));
}
