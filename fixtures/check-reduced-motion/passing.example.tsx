// passing: includes @media (prefers-reduced-motion) block with all required vars and MotionConfig reducedMotion="user"
import { MotionConfig, motion } from 'motion/react';

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
  return (
    <MotionConfig reducedMotion="user">
      <motion.div animate={{ opacity: 1 }}>
        <p>Animations respect prefers-reduced-motion via both CSS and JS layers.</p>
      </motion.div>
    </MotionConfig>
  );
}
