/** @internal — reduced-motion media query hook; not part of the public API. */
/**
 * useReducedMotion — subscribes to `prefers-reduced-motion: reduce`.
 *
 * Backs useHdsMotion() so JS/Motion (motion/react) durations collapse the
 * same way the CSS `--hds-*-duration` vars already do under Layer 1 (see
 * scripts/check-reduced-motion.mjs). Hydration-safe: useSyncExternalStore with a
 * `false` server snapshot, so SSR and the hydration pass agree; the client
 * then re-renders with the real preference and updates live on change.
 */
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange); // Safari < 14 fallback (zero-cost).
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', onChange);
    else mq.removeListener(onChange);
  };
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Server and hydration render `false`, so SSR markup matches (React #418). */
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
