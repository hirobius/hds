/** @internal — reactive `hds.motion.*` accessor; not part of the public API. */
/**
 * useHdsMotion — the reactive read path for `hds.motion.*` (#190).
 *
 * `hds.motion.*` (src/app/design-system/tokens.ts) resolves duration as a
 * static JS number computed once at module load, so a component that spreads
 * it straight into a motion/react `transition` never collapses under
 * `prefers-reduced-motion: reduce` — only the CSS custom-property path
 * (Layer 1, theme.css) reacts automatically. Call this hook instead of
 * reading `hds.motion.<category>` directly: it zeroes `duration` while
 * useReducedMotion() is true, one fix point instead of a `MotionConfig`
 * wrapper per component.
 */
import { motion as hdsMotion } from '../design-system/motion-tokens';
import { useReducedMotion } from './useReducedMotion';

type HdsMotionCategory = keyof typeof hdsMotion;

export function useHdsMotion<Category extends HdsMotionCategory>(
  category: Category,
): (typeof hdsMotion)[Category] {
  const reduced = useReducedMotion();
  const token = hdsMotion[category];
  return reduced ? { ...token, duration: 0 } : token;
}

/**
 * Fade props for one side of a true crossfade (AsyncState status blocks,
 * toggle Button labels): spread onto the entering and exiting motion nodes
 * so the old node fades out while the new one fades in, on the category's
 * curve. Pair with `AnimatePresence` + `useIsPresent`.
 */
export function crossfadeFade(motion: (typeof hdsMotion)['productive']) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: motion.duration, ease: motion.easing },
  };
}
