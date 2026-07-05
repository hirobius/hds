/**
 * VisuallyHidden — content available to assistive tech but hidden visually.
 * @category Utility
 * @tier primitive
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLElement> {
  /** Element rendered as the wrapper. Defaults to 'span'. */
  as?: React.ElementType;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Renders its children off-screen (Tailwind `sr-only`) so they are announced by
 * screen readers without occupying visual space — e.g. a text label for an
 * icon-only control.
 */
export const VisuallyHidden = React.forwardRef<HTMLElement, VisuallyHiddenProps>(
  function VisuallyHidden({ as: Tag = 'span', className, children, ...props }, ref) {
    return (
      <Tag ref={ref} className={cn('sr-only', className)} {...props}>
        {children}
      </Tag>
    );
  },
);
