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
export function NewTabHint() {
  return <span className="sr-only"> (opens in new tab)</span>;
}
