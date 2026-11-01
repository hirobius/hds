/** @internal — shared by the scrolling strips (tab list, segmented rail, table); not part of the public API surface. */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Which edges of a horizontal scroller have content scrolled out of view. */
export type ScrollEdgeOverflow = 'start' | 'end' | 'both' | undefined;

export function measureScrollEdges(el: HTMLElement): ScrollEdgeOverflow {
  const hiddenStart = el.scrollLeft > 1;
  const hiddenEnd = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  if (hiddenStart && hiddenEnd) return 'both';
  if (hiddenStart) return 'start';
  if (hiddenEnd) return 'end';
  return undefined;
}

const FADE_VAR = '--semantic-space-scale-lg';
const FADE = `var(${FADE_VAR})`;

/**
 * Mask that fades the edge(s) with hidden content, one fade width (scale.lg) deep.
 * Inline, so it costs no CSS; a mask needs no colour, so it holds in light and dark.
 */
export function scrollEdgeFadeStyle(overflow: ScrollEdgeOverflow): CSSProperties | undefined {
  if (!overflow) return undefined;
  const start = overflow === 'end' ? '0px' : FADE;
  const end = overflow === 'start' ? '0px' : FADE;
  const mask = `linear-gradient(90deg,transparent,currentColor ${start},currentColor calc(100% - ${end}),transparent)`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

/**
 * Tracks a horizontal scroller's hidden edges for `data-overflow` and the fade.
 * Wire `ref` to the scroller and call `update` from its onScroll; a ResizeObserver
 * re-measures when the scroller or its viewport changes size.
 */
export function useScrollEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [overflow, setOverflow] = useState<ScrollEdgeOverflow>(undefined);

  const update = useCallback(() => {
    if (ref.current) setOverflow(measureScrollEdges(ref.current));
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  return { ref, overflow, update };
}

/**
 * Scrolls `container` (and only it) the least distance that shows `item`, keeping one
 * fade width clear so the item does not sit under the edge fade (`inline: 'nearest'`).
 * Element.scrollIntoView is not used because it also scrolls the page to the control.
 */
function revealInline(container: HTMLElement, item: HTMLElement, smooth: boolean): void {
  const box = container.getBoundingClientRect();
  const target = item.getBoundingClientRect();
  const fade =
    typeof getComputedStyle === 'function'
      ? parseFloat(getComputedStyle(container).getPropertyValue(FADE_VAR)) || 0
      : 0;
  // The room to show the item, less a fade on each side; never negative.
  const room = Math.max(0, box.width - 2 * fade);
  let delta = 0;
  if (target.left < box.left + fade || target.width > room) {
    delta = target.left - (box.left + fade);
  } else if (target.right > box.right - fade) {
    delta = target.right - (box.right - fade);
  }
  if (Math.abs(delta) < 1) return;
  const left = container.scrollLeft + delta;
  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
  } else {
    container.scrollLeft = left;
  }
}

/**
 * Keeps the selected item of a horizontal scroller in view: on mount (instantly) and
 * whenever the selection changes (smoothly, unless prefers-reduced-motion asks for none).
 * The selected item is the first descendant matching `selector`; selection changes are
 * seen through its state attributes, so it works whether the value is controlled or not.
 */
export function useKeepSelectedInView(
  ref: { readonly current: HTMLElement | null },
  selector: string,
): void {
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let selected = container.querySelector<HTMLElement>(selector);
    if (selected) revealInline(container, selected, false);
    if (typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(() => {
      const next = container.querySelector<HTMLElement>(selector);
      if (!next || next === selected) return;
      selected = next;
      revealInline(container, next, !reducedRef.current);
    });
    mo.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-selected', 'aria-checked'],
    });
    return () => mo.disconnect();
  }, [ref, selector]);
}
