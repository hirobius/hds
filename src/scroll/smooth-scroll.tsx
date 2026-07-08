/**
 * SmoothScroll — opt-in Lenis smooth-scroll provider for HDS.
 *
 * The one scroll capability neither CSS `animation-timeline` nor Motion's
 * `useScroll` can provide: momentum-smoothed ("inertia") scrolling. Ships behind
 * the dedicated `@hirobius/design-system/scroll` subpath with `lenis` as an
 * OPTIONAL peer dependency, so it is never in the main barrel and consumers who
 * don't import it pay nothing (ADR-021).
 *
 * Wraps Lenis's official React integration (`lenis/react`) and adds HDS
 * conventions:
 *   - **Reduced-motion first.** When the user prefers reduced motion, Lenis is
 *     not instantiated at all — children render against native scroll. Override
 *     with `ignoreReducedMotion` only for a deliberate art-directed exception.
 *   - **SSR-safe.** The reduced-motion probe runs client-side; server render and
 *     first paint fall back to native scroll, then upgrade on mount.
 *   - **Tokenized defaults.** A premium duration/easing out of the box,
 *     overridable via `options`.
 *
 * Lenis drives the real scroll position, so CSS scroll-driven animations and
 * `useScrollProgress` (Motion) keep working underneath it unchanged.
 *
 * @example
 * import { SmoothScroll } from '@hirobius/design-system/scroll';
 * // one provider at the app/site root:
 * <SmoothScroll><App /></SmoothScroll>
 */
import * as React from 'react';
import { ReactLenis } from 'lenis/react';

/** Lenis options, derived from the official React integration (no extra import). */
export type SmoothScrollOptions = NonNullable<React.ComponentProps<typeof ReactLenis>['options']>;

export interface SmoothScrollProps {
  children: React.ReactNode;
  /** Lenis options merged over the HDS defaults (duration, easing, smoothWheel). */
  options?: SmoothScrollOptions;
  /**
   * Hijack the window/document scroll (the usual root-level setup). Default `true`.
   * Set `false` to scope smoothing to a wrapper element instead.
   */
  root?: boolean;
  /**
   * Run smoothing even when the user prefers reduced motion. Default `false`
   * (the preference is respected — momentum scroll is a motion effect).
   */
  ignoreReducedMotion?: boolean;
}

/**
 * HDS default feel — a premium 1.2s exponential ease-out (the widely-used Lenis
 * baseline). Overridable per-site via `options`. Kept in seconds to match
 * `hds.motion.*` token durations.
 */
const HDS_DEFAULTS: SmoothScrollOptions = {
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * SSR-safe `prefers-reduced-motion` probe via `useSyncExternalStore` — no
 * set-state-in-effect, server snapshot is `false` (native scroll), and it reads
 * `window.matchMedia` live so the preference is respected on the client.
 */
function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () =>
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia(REDUCED_MOTION_QUERY).matches
        : false,
    () => false,
  );
}

/** @public */
export function SmoothScroll({
  children,
  options,
  root = true,
  ignoreReducedMotion = false,
}: SmoothScrollProps) {
  const prefersReduced = usePrefersReducedMotion();

  // Respect reduced-motion: skip Lenis entirely, fall back to native scroll.
  if (prefersReduced && !ignoreReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root={root} options={{ ...HDS_DEFAULTS, ...options }}>
      {children}
    </ReactLenis>
  );
}
