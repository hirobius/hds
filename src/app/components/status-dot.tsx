/**
 * StatusDot — compact solid status indicator dot.
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { warnOnce } from '../../lib/deprecation';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone drives a single solid feedback hue; size is on the 8px grid. Neutral uses
// the muted content color so the dot never introduces a second hue on its own.
const statusDotVariants = /* @__PURE__ */ cva('inline-block shrink-0 rounded-full', {
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

/**
 * A small solid dot conveying a semantic status via `tone`.
 *
 * @deprecated Use `<Badge dot>`: `tone`, `size` and `label` are the same, and
 * so is the dot. Badge takes no `style`, so move a `style` to a wrapper or a
 * `className` first (MIGRATIONS.md, hds#395). Kept in 0.20.0 because ops passes
 * StatusDot a `style` no codemod can carry over.
 * @removeIn 0.21.0
 * @useInstead Badge with `dot`
 */
export const StatusDot = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, StatusDotProps>(
  function StatusDot({ className, tone, size, label, ...props }, ref) {
    warnOnce(
      'status-dot-deprecated',
      'StatusDot is deprecated and is removed in 0.21.0. Use <Badge dot> with the same tone, size and label; Badge takes no style, so move a style to a wrapper or a className (MIGRATIONS.md, hds#395).',
    );
    return (
      <span
        ref={ref}
        data-tone={tone ?? 'neutral'}
        className={cn(statusDotVariants({ tone, size }), className)}
        {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
        {...props}
      />
    );
  },
);
