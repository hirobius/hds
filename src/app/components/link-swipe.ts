/**
 * Shared pointer handler for the `.hds-link` underline swipe (C2).
 *
 * The swipe itself is CSS (theme.css `.hds-link[data-link-swipe]`). This module only
 * (re)starts it and picks its direction, which follows the pointer like the Button wipe:
 * entering from the left half or leaving by the right half is moving right (the line
 * shrinks out to the right, then grows in from the left); the mirror is moving left.
 * Keyboard focus, or any event with no pointer position, moves right.
 *
 * Each play removes `data-link-swipe`, forces a reflow so a running animation is dropped,
 * and sets it to `right` or `left`, so the line swipes from the start even mid-swipe.
 * `animationend` clears it. One document-level listener set serves every link, and it
 * writes the DOM directly, so a hover never re-renders anything.
 */

export type SwipeDirection = 'left' | 'right';

const SELECTOR = '.hds-link';
const ATTR = 'data-link-swipe';

function play(el: Element, direction: SwipeDirection) {
  el.removeAttribute(ATTR);
  void (el as HTMLElement).offsetWidth; // drop the running animation before restarting
  el.setAttribute(ATTR, direction);
}

/** Which way the pointer is moving, from the half of `el` it is on as it crosses. */
export function swipeDirection(el: Element, event: PointerEvent): SwipeDirection {
  const rect = el.getBoundingClientRect();
  if (!rect.width) return 'right';
  const leftHalf = event.clientX < rect.left + rect.width / 2;
  // Entering from the left half moves right; leaving by the left half moves left.
  return (event.type === 'pointerover') === leftHalf ? 'right' : 'left';
}

function onPointer(event: PointerEvent) {
  const el = event.target instanceof Element ? event.target.closest(SELECTOR) : null;
  if (!el) return;
  const other = event.relatedTarget;
  if (other instanceof Node && el.contains(other)) return; // moving within the link
  play(el, swipeDirection(el, event));
}

function focusVisible(el: Element) {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true; // no :focus-visible support: treat focus as keyboard focus
  }
}

function onFocus(event: FocusEvent) {
  const el = event.target instanceof Element ? event.target.closest(SELECTOR) : null;
  if (el && focusVisible(el)) play(el, 'right');
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
  document.addEventListener('pointerover', onPointer);
  document.addEventListener('pointerout', onPointer);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('animationend', clear);
}
