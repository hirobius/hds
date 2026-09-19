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
import hds from '../design-system/tokens';
import { useReducedMotion } from './useReducedMotion';

export type HdsMotionCategory = keyof typeof hds.motion;

export function useHdsMotion<Category extends HdsMotionCategory>(
  category: Category,
): (typeof hds.motion)[Category] {
  const reduced = useReducedMotion();
  const token = hds.motion[category];
  return reduced ? { ...token, duration: 0 } : token;
}
