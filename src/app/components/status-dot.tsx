/**
 * StatusDot — compact solid status indicator dot.
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone drives a single solid feedback hue; size is on the 8px grid. Neutral uses
// the muted content color so the dot never introduces a second hue on its own.
const statusDotVariants = cva('inline-block shrink-0 rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-muted-foreground',
      info: 'bg-feedback-info',
      success: 'bg-feedback-success',
      danger: 'bg-feedback-danger',
      warning: 'bg-feedback-warning',
      inProgress: 'bg-feedback-inProgress',
    },
    size: {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-2.5 w-2.5',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type StatusDotVariantProps = VariantProps<typeof statusDotVariants>;

/** @public */
export interface StatusDotProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>, StatusDotVariantProps {
  /**
   * Accessible name for the status. When provided the dot is exposed as a
   * `role="status"` with this label; when omitted the dot is decorative
   * (`aria-hidden`) and a sibling should carry the meaning.
   */
  label?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** A small solid dot conveying a semantic status via `tone`. */
export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(function StatusDot(
  { className, tone, size, label, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      data-tone={tone ?? 'neutral'}
      className={cn(statusDotVariants({ tone, size }), className)}
      {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
      {...props}
    />
  );
});

/** @internal — CVA variant helper; compose via StatusDot props instead. */
export { statusDotVariants };
