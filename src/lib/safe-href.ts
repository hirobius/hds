/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * URL guard for every HDS link surface (hds#1145).
 *
 * React 18 only warns on a `javascript:` href and still renders it, so a link
 * whose href comes from untrusted data runs script on click. HDS supports
 * React 18, so it cannot rely on React 19's block. This guard refuses the
 * schemes that can run script in the page (`javascript:`, `vbscript:`,
 * `data:`) and keeps all other values unchanged (paths, #hash, ?query,
 * http(s), protocol-relative, mailto:, tel:, sms: and other schemes).
 *
 * The scheme is read the way the WHATWG URL parser reads it: leading C0
 * controls and spaces are stripped and ASCII tab/LF/CR are removed anywhere,
 * so `" java\tscript:"` is still caught.
 */

/** The href an unsafe value becomes: inert, and easy to find in the DOM. */
export const BLOCKED_HREF = 'about:blank#blocked';

const UNSAFE_SCHEME = /^(?:javascript|vbscript|data):/i;

/** Return `href` when it is safe to put in an anchor, else {@link BLOCKED_HREF}. */
export function safeHref(href: string): string {
  const normalized = href.replace(/^[\u0000- ]+/, '').replace(/[\t\n\r]/g, '');
  return UNSAFE_SCHEME.test(normalized) ? BLOCKED_HREF : href;
}
