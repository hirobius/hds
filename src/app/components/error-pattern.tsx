/**
 * ErrorPattern - governed recovery surface for routed application errors.
 * @category Feedback
 * @tier template
 */
import { motion } from 'motion/react';
import { useHdsRouter } from '../context/RouterContext';
import hds from '../design-system/tokens';
import { Button } from './button';
import { Stack } from './stack';
import { Surface } from './surface';
import { Text } from './text';

type ErrorPatternProps = {
  /** Large recovery headline rendered through the animated cascade treatment. */
  displayText?: string;
  /** Supporting message explaining the recovery state to the user. */
  message?: string;
};

const recoveryWrapStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  fontFamily: hds.fontFamily,
};

/** @public */
export function ErrorPattern({
  displayText = 'Oops',
  message = 'Something went wrong',
}: ErrorPatternProps) {
  const { navigate } = useHdsRouter();

  return (
    <div style={recoveryWrapStyle} data-role="error-recovery">
      <Surface padding="component">
        <motion.div
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hds.motion.spatial.duration, ease: hds.motion.spatial.easing }}
        >
          <Stack gap="normal" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Text
              variant="display"
              as="h1"
              className="text-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {displayText}
            </Text>

            <Text
              variant="heading2"
              as="p"
              className="text-secondary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {message}
            </Text>

            <Button variant="primary" onClick={() => {
              if (typeof window !== 'undefined') window.history.back();
              else navigate('/');
            }}>
              Back
            </Button>
          </Stack>
        </motion.div>
      </Surface>
    </div>
  );
}
