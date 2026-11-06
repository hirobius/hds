/**
 * NumberValue — a number that animates between values (NumberFlow, MIT).
 *
 * Ships only behind `@hirobius/design-system/number`, with
 * `@number-flow/react` as an OPTIONAL peer: the main entry never imports it
 * (hds#751). A change of `value` rolls the digits with the productive motion
 * token (`hds.motion.productive`). When the user prefers reduced motion the
 * final value renders at once, with no animation.
 */
import NumberFlow, { type Format } from '@number-flow/react';
import { motion } from '../app/design-system/motion-tokens';
import { useReducedMotion } from '../app/hooks/useReducedMotion';

export interface NumberValueProps {
  /** The number to show. A change animates to the new value. */
  value: number;
  /** `Intl.NumberFormat` options, e.g. `{ style: 'percent' }`. */
  format?: Format;
  /** Locales for `Intl.NumberFormat`. Default: the runtime locale. */
  locales?: Intl.LocalesArgument;
  /** Text before the number, inside the same accessible label. */
  prefix?: string;
  /** Text after the number, inside the same accessible label. */
  suffix?: string;
  /** Set `false` to show every change at once. Reduced motion always does. */
  animated?: boolean;
  className?: string;
}

const productive: EffectTiming = {
  duration: Math.round(motion.productive.duration * 1000),
  easing: `cubic-bezier(${motion.productive.easing.join(', ')})`,
};

export function NumberValue({ animated = true, ...props }: NumberValueProps) {
  const reducedMotion = useReducedMotion();
  return (
    <NumberFlow
      {...props}
      animated={animated && !reducedMotion}
      transformTiming={productive}
      spinTiming={productive}
      opacityTiming={productive}
    />
  );
}
