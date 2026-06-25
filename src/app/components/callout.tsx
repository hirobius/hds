/**
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

type CalloutTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone drives the left-rule color and the bg. accent/info/success/warning use the
// raised bg for grouping; danger inverts to surface-page so the red rule stands
// out against the surrounding raised card surface. The feedback rule colors use
// the named border utilities (border-feedback-*) from tailwind.config; accent +
// the surface backgrounds have no named utility, so they stay var()-based.
// outline-ok: the left border is a signal-bearing rule, not a container outline.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven padding + accent/surface vars have no Tailwind-theme utility
const calloutVariants = cva('border-l-[3px] p-[var(--semantic-space-component-padding)]', {
  variants: {
    tone: {
      accent:
        'border-l-[color:var(--semantic-color-content-accent)] bg-[color:var(--semantic-color-surface-raised)]',
      info: 'border-l-feedback-info bg-[color:var(--semantic-color-surface-raised)]',
      success: 'border-l-feedback-success bg-[color:var(--semantic-color-surface-raised)]',
      warning: 'border-l-feedback-warning bg-[color:var(--semantic-color-surface-raised)]',
      danger: 'border-l-feedback-danger bg-[color:var(--semantic-color-surface-page)]',
    },
    italic: {
      true: 'italic',
      false: 'not-italic',
    },
  },
  defaultVariants: { tone: 'info', italic: false },
});

type CalloutVariantProps = VariantProps<typeof calloutVariants>;

export interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>, Omit<CalloutVariantProps, 'italic'> {
  /** Tone — drives the left rule color and bg tint. */
  tone?: CalloutTone;
  /** Italicize the body content (quote / pull-quote pattern). */
  italic?: boolean;
}

/**
 * Tone-driven side-rule callout for status, quotes, hypotheses.
 */
export const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(function Callout(
  { tone = 'info', italic = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-tone={tone}
      className={cn(calloutVariants({ tone, italic }), className)}
      {...rest}
    >
      {children}
    </div>
  );
});

export default Callout;
