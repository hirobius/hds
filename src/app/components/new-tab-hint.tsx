/**
 * NewTabHint — the visually hidden " (opens in new tab)" an external link ends with.
 * @category Utility
 * @tier utility
 * @usage Inside an external link that opens a new tab, so a screen reader hears what the decorative arrow shows (hds#1537). InlineLink and Button `external` render it for you.
 * @whenNot A link that opens in the same tab, or any other hidden text (use VisuallyHidden).
 * @useInstead VisuallyHidden for other text only assistive technology needs
 *
 * @internal Not exported from the package root.
 */
export const NEW_TAB_TEXT = ' (opens in new tab)';

export function NewTabHint() {
  return <span className="sr-only">{NEW_TAB_TEXT}</span>;
}

/**
 * An aria-label replaces the text, hidden hint included, so an external link's
 * aria-label must carry the hint itself: `{ 'aria-label': name + hint }`, or nothing.
 */
export const newTabName = (name: unknown) =>
  typeof name === 'string' && name ? { 'aria-label': name + NEW_TAB_TEXT } : null;
