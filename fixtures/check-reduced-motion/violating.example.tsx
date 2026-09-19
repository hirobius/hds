// violating: no @media (prefers-reduced-motion) block in theme.css (Layer 1),
// and reads hds.motion.* directly instead of useHdsMotion() (Layer 2, #190).
import { motion } from 'motion/react';
import hds from '../../src/app/design-system/tokens';

export function App() {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
    >
      <p>Animations run regardless of user motion preferences.</p>
    </motion.div>
  );
}
