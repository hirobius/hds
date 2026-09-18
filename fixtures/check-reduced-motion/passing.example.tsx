// passing: includes @media (prefers-reduced-motion) block with all required
// vars (Layer 1), and reads motion timing through useHdsMotion() instead of
// the raw token object, so `duration` collapses under prefers-reduced-motion
// without a per-component <MotionConfig> wrapper (Layer 2, #190).
// (theme-toggle.tsx's own <MotionConfig reducedMotion="user"> wrapper is a
// valid alternate pattern too — it just never reads the raw token object
// directly, so it wouldn't trip Layer 2 either.)
import { motion } from 'motion/react';
import { useHdsMotion } from '../../src/app/hooks/useHdsMotion';

/*
 * theme.css reduced-motion block (inline for fixture scanning):
 *
 * @media (prefers-reduced-motion: reduce) {
 *   :root {
 *     --primitive-duration-instant: 0s;
 *     --primitive-duration-short: 0s;
 *     --primitive-duration-medium: 0s;
 *     --primitive-duration-long: 0s;
 *     --hds-motion-productive-duration: 0s;
 *     --hds-motion-expressive-duration: 0s;
 *     --hds-motion-spatial-duration: 0s;
 *     --hds-motion-exit-duration: 0s;
 *   }
 * }
 */

export function App() {
  const productiveMotion = useHdsMotion('productive');

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: productiveMotion.duration, ease: productiveMotion.easing }}
    >
      <p>useHdsMotion() zeroes duration under prefers-reduced-motion.</p>
    </motion.div>
  );
}
