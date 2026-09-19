/** @internal — reduced-motion media query hook; not part of the public API. */
/**
 * useReducedMotion — subscribes to `prefers-reduced-motion: reduce`.
 *
 * Backs useHdsMotion() so JS/Motion (motion/react) durations collapse the
 * same way the CSS `--hds-*-duration` vars already do under Layer 1 (see
 * scripts/check-reduced-motion.mjs). SSR-safe: defaults to `false` when
 * `matchMedia` is unavailable, and updates live on OS preference change.
 */
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function readPreference(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // Safari < 14 fallback (zero-cost).
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}
