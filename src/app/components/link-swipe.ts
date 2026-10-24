/**
 * Shared pointer handler for the `.hds-link` underline swipe (C2).
 *
 * The swipe itself is CSS (theme.css `.hds-link[data-link-swipe]`). This module only
 * (re)starts it: on pointer enter and again on pointer leave it removes `data-link-swipe`,
 * forces a reflow so the running animation is dropped, and sets it again, so the line
 * swipes from the start even mid-swipe. `animationend` clears it. One document-level
 * listener set serves every link, and it writes the DOM directly, so a hover never
 * re-renders anything.
 */

const SELECTOR = '.hds-link';
const ATTR = 'data-link-swipe';

function play(event: PointerEvent) {
  const el = event.target instanceof Element ? event.target.closest(SELECTOR) : null;
  if (!el) return;
  const other = event.relatedTarget;
  if (other instanceof Node && el.contains(other)) return; // moving within the link
  el.removeAttribute(ATTR);
  void (el as HTMLElement).offsetWidth; // drop the running animation before restarting
  el.setAttribute(ATTR, '');
}

function clear(event: Event) {
  if (event.target instanceof Element && event.target.matches(SELECTOR))
    event.target.removeAttribute(ATTR);
}

let installed = false;

/** Install the document-level listeners once (no-op on the server and on repeat calls). */
export function installLinkSwipeListeners() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('pointerover', play);
  document.addEventListener('pointerout', play);
  document.addEventListener('animationend', clear);
}
