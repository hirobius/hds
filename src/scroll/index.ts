/**
 * @hirobius/design-system/scroll — opt-in scroll-motion primitives.
 *
 * Ships behind a dedicated subpath with `lenis` as an OPTIONAL peer dependency
 * (install `lenis` alongside HDS to use `SmoothScroll`). Never in the main
 * barrel — consumers who don't import this pay nothing. See ADR-021 and #116.
 *
 * - `SmoothScroll` — Lenis momentum-scroll provider (reduced-motion-first, SSR-safe).
 * - `useLenis` — access the active Lenis instance / subscribe to scroll (re-exported
 *   from `lenis/react`).
 * - `useScrollProgress` — Motion-based 0→1 scroll progress for a target element
 *   (no new dependency; works with or without `SmoothScroll`).
 */
export { SmoothScroll, type SmoothScrollProps, type SmoothScrollOptions } from './smooth-scroll';
export {
  useScrollProgress,
  type UseScrollProgressOptions,
  type ScrollOffset,
} from './use-scroll-progress';
export { useLenis } from 'lenis/react';
