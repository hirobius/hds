/**
 * TimeInput — token-skinned time field on a native <input type="time">.
 * @category Inputs
 * @tier primitive
 * @public
 *
 * The time-only member of the date/time family (ADR-020). It deliberately does
 * NOT pull in the calendar dependency — a native `<input type="time">` gives the
 * platform time picker, keyboard entry, and locale formatting for free, skinned
 * with the same chrome as `Input`.
 */
// motion-ok: focus ring via transition-colors; the native control owns the picker UI.

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

const hdsTimeInputVariants = cva(
  'flex w-full rounded-md border border-input bg-background text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70',
  {
    variants: {
      size: {
        sm: 'h-8 px-2 text-xs',
        md: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type TimeInputVariantProps = VariantProps<typeof hdsTimeInputVariants>;

/** @public */
export interface TimeInputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
    TimeInputVariantProps {}

// ── Component ──────────────────────────────────────────────────────────────────

/** A native time field skinned with HDS input chrome. Value is a `HH:mm` string. */
export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  { className, size, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="time"
      className={cn(hdsTimeInputVariants({ size }), className)}
      {...props}
    />
  );
});

/** @internal — CVA variant helper; compose via TimeInput props instead. */
export { hdsTimeInputVariants };
