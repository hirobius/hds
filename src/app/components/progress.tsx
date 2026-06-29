/**
 * Progress - linear progress bar (determinate or indeterminate).
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
const progressTrackVariants = cva('w-full overflow-hidden rounded-full bg-muted', {
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: { size: 'md' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type ProgressVariantProps = VariantProps<typeof progressTrackVariants>;

/** @public */
export interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'>,
    ProgressVariantProps {
  /**
   * Completion 0–100. Omit (or pass null) for an indeterminate bar that
   * animates until the work completes.
   */
  value?: number | null;
  /** Accessible label for the progress bar. */
  label?: string;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Linear progress. Determinate when `value` is a number, else indeterminate. */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { className, size, value = null, label = 'Progress', ...props },
  ref,
) {
  const isIndeterminate = value === null || value === undefined;
  const pct = isIndeterminate ? 100 : clampPercent(value);

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label={label}
      aria-valuemin={isIndeterminate ? undefined : 0}
      aria-valuemax={isIndeterminate ? undefined : 100}
      aria-valuenow={isIndeterminate ? undefined : Math.round(pct)}
      data-state={isIndeterminate ? 'indeterminate' : 'determinate'}
      className={cn(progressTrackVariants({ size }), className)}
      {...props}
    >
      <div
        className={cn(
          'h-full rounded-full bg-accent transition-[width] duration-300 ease-out',
          isIndeterminate && 'animate-pulse motion-reduce:animate-none',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
});

/** @internal — CVA variant helper; compose via Progress props instead. */
export { progressTrackVariants };
