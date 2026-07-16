// violating: no @media (prefers-reduced-motion) block in theme.css
import { motion } from 'motion/react';

export function App() {
  return (
    <motion.div animate={{ opacity: 1 }}>
      <p>Animations run regardless of user motion preferences.</p>
    </motion.div>
  );
}
