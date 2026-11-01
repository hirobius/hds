/**
 * Shared pointer/focus handler for Button `hoverEffect="wipe"`.
 *
 * The wipe itself is CSS (theme.css `.hds-btn-wipe`: a scaled fill layer). This
 * module only records WHICH edge the pointer crossed and WHETHER the fill is in,
 * as two data attributes on the button: `data-wipe-edge` (left|right|top|bottom)
 * and `data-wipe` (idle|in|out). The edge also lands as one inline custom
 * property the layer reads (`--hds-wipe-c`, its clip-path: collapsed onto that
 * edge, or inset(0) when in), which keeps per-state rules out of the shipped CSS. It writes the DOM directly, so a hover never
 * re-renders a Button, and one document-level listener set serves every button.
 *
 * `idle` is the instant reset: when the pointer re-enters from a different
 * edge the collapsed fill must jump to that edge before it grows, with no
 * transition, so enter goes idle -> (reflow) -> in.
 */

type WipeEdge = 'left' | 'right' | 'top' | 'bottom';

const SELECTOR = '[data-hover-effect="wipe"]';

/** The edge of `rect` closest to the point. */
export function nearestEdge(rect: DOMRect, x: number, y: number): WipeEdge {
  const d: Array<[WipeEdge, number]> = [
    ['left', Math.abs(x - rect.left)],
    ['right', Math.abs(rect.right - x)],
    ['top', Math.abs(y - rect.top)],
    ['bottom', Math.abs(rect.bottom - y)],
  ];
  return d.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
}

function target(node: EventTarget | null): HTMLElement | null {
  const el = node instanceof Element ? node.closest<HTMLElement>(SELECTOR) : null;
  if (!el) return null;
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true')
    return null;
  return el;
}

function matches(el: Element, query: string): boolean {
  try {
    return el.matches(query);
  } catch {
    return false;
  }
}

/** The layer's clip when collapsed onto `edge`: everything but that edge is cut away. */
const COLLAPSED: Record<WipeEdge, string> = {
  left: 'inset(0 100% 0 0)',
  right: 'inset(0 0 0 100%)',
  top: 'inset(0 0 100% 0)',
  bottom: 'inset(100% 0 0 0)',
};

function setEdge(el: HTMLElement, edge: WipeEdge) {
  el.setAttribute('data-wipe-edge', edge);
  el.style.setProperty('--hds-wipe-c', COLLAPSED[edge]);
}

function fillIn(el: HTMLElement, edge: WipeEdge) {
  if (el.getAttribute('data-wipe') === 'in') return;
  setEdge(el, edge);
  el.setAttribute('data-wipe', 'idle');
  el.style.setProperty('--hds-wipe-t', '0s');
  void el.offsetWidth; // commit the collapsed state on the new edge before growing
  el.style.removeProperty('--hds-wipe-t');
  el.setAttribute('data-wipe', 'in');
  el.style.setProperty('--hds-wipe-c', 'inset(0)');
}

function fillOut(el: HTMLElement, edge: WipeEdge) {
  if (el.getAttribute('data-wipe') !== 'in') return;
  setEdge(el, edge);
  el.setAttribute('data-wipe', 'out');
}

function onPointerOver(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  const el = target(e.target);
  if (!el || el.contains(e.relatedTarget as Node | null)) return;
  fillIn(el, nearestEdge(el.getBoundingClientRect(), e.clientX, e.clientY));
}

function onPointerOut(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  const el = target(e.target);
  if (!el || el.contains(e.relatedTarget as Node | null)) return;
  if (matches(el, ':focus-visible')) return; // keyboard focus keeps the fill
  fillOut(el, nearestEdge(el.getBoundingClientRect(), e.clientX, e.clientY));
}

function onFocusIn(e: FocusEvent) {
  const el = target(e.target);
  if (!el || !matches(el, ':focus-visible')) return;
  fillIn(el, 'left');
}

function onFocusOut(e: FocusEvent) {
  const el = target(e.target);
  if (!el || el.contains(e.relatedTarget as Node | null)) return;
  if (matches(el, ':hover')) return; // the pointer still holds the fill
  fillOut(el, 'right');
}

let installed = false;

/** Idempotent; called by Button when it renders with `hoverEffect="wipe"`. */
export function installWipeListeners() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('pointerover', onPointerOver);
  document.addEventListener('pointerout', onPointerOut);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
}
