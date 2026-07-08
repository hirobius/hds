/**
 * useScrollProgress — a tokenized wrapper over Motion's `useScroll`.
 *
 * Returns a `0 → 1` MotionValue tracking a target element's travel through the
 * viewport, for JS-driven scroll effects that CSS `animation-timeline` can't
 * express (cross-element choreography, canvas/WebGL, values you need in React).
 * Built on `motion/react` — already the HDS animation engine — so it adds no new
 * dependency, and it works with or without {@link SmoothScroll} (Lenis drives
 * the real scroll position, which Motion reads).
 *
 * For the common "reveal on enter / scale on scroll" cases, prefer CSS
 * scroll-driven animation (`animation-timeline: view()`) — zero JS. Reach for
 * this hook only when you genuinely need the progress value in React.
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * const progress = useScrollProgress(ref);
 * const scale = useTransform(progress, [0, 1], [0.4, 1]);
 * return <motion.div ref={ref} style={{ scale }} />;
 */
import { useScroll, type MotionValue } from 'motion/react';
import type { RefObject } from 'react';

/** Scroll offset pair (Motion `useScroll` semantics), e.g. `['start end', 'end start']`. */
export type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

export interface UseScrollProgressOptions {
  /**
   * Where progress starts (0) and ends (1), in Motion's `[targetEdge viewportEdge, …]`
   * form. Defaults to `['start end', 'end start']` — 0 as the target's top enters
   * the bottom of the viewport, 1 as its bottom leaves the top.
   */
  offset?: ScrollOffset;
}

/** @public */
export function useScrollProgress(
  target: RefObject<HTMLElement | null>,
  options?: UseScrollProgressOptions,
): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target,
    offset: options?.offset ?? ['start end', 'end start'],
  });
  return scrollYProgress;
}
