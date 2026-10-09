/**
 * ErrorPattern - governed recovery surface for routed application errors.
 * @category Feedback
 * @usage Show an error with a short message and a Back button, in place or as a full page.
 * @tier template
 */
import { motion } from 'motion/react';
import hds from '../design-system/tokens';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { Button } from './button';
import { Stack } from './stack';
import { Surface } from './surface';
import { Text } from './text';

export type ErrorPatternProps = {
  /** Large recovery headline rendered through the animated cascade treatment. */
  displayText?: string;
  /** Supporting message explaining the recovery state to the user. */
  message?: string;
  /**
   * Fill the viewport height and centre the surface in it, for a routed error page.
   * Off by default: the pattern then fits its container and never exceeds it.
   */
  fullPage?: boolean;
};

const recoveryWrapStyle = {
  display: 'flex',
  maxWidth: '100%',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  fontFamily: hds.fontFamily,
};

/**
 * @public
 */
export function ErrorPattern({
  displayText = 'Oops',
  message = 'Something went wrong',
  fullPage = false,
}: ErrorPatternProps) {
  const spatialMotion = useHdsMotion('spatial');

  return (
    <div
      style={fullPage ? { ...recoveryWrapStyle, minHeight: '100vh' } : recoveryWrapStyle}
      data-role="error-recovery"
    >
      <Surface padding="component" className="min-w-0 max-w-full">
        <motion.div
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: spatialMotion.duration, ease: spatialMotion.easing }}
        >
          <Stack gap="normal" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Text
              variant="display"
              as="h1"
              className="text-primary"
              style={{ overflowWrap: 'anywhere' }}
            >
              {displayText}
            </Text>

            <Text
              variant="title"
              as="p"
              className="text-secondary"
              style={{ overflowWrap: 'anywhere' }}
            >
              {message}
            </Text>

            <Button
              variant="primary"
              onClick={() => {
                // History "back" — router-agnostic and identical to react-router's
                // navigate(-1) since both drive window.history.
                if (typeof window !== 'undefined') window.history.back();
              }}
            >
              Back
            </Button>
          </Stack>
        </motion.div>
      </Surface>
    </div>
  );
}
