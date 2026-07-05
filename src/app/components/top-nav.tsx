/**
 * TopNav — top-of-page navigation bar with brand, nav links, and trailing
 * actions rendered as a semantic <header> row, optionally sticky to the top.
 * @category Navigation
 * @tier pattern
 * @public
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Leading brand slot (e.g. logo/wordmark). */
  brand?: React.ReactNode;
  /** Nav links, placed left after the brand and wrapped in a <nav>. */
  children?: React.ReactNode;
  /** Trailing actions, pushed to the far right. */
  trailing?: React.ReactNode;
  /** Pins the bar to the top of its scroll container. */
  sticky?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Top navigation bar with brand, nav, and trailing action slots. */
export const TopNav = React.forwardRef<HTMLElement, TopNavProps>(function TopNav(
  { className, brand, trailing, sticky, children, ...rest },
  ref,
) {
  return (
    <header
      ref={ref}
      data-sticky={sticky || undefined}
      className={cn(
        'flex items-center gap-4 h-14 w-full border-b border-border bg-background px-4',
        sticky && 'sticky top-0 z-40',
        className,
      )}
      {...rest}
    >
      {brand !== undefined && <span className="shrink-0">{brand}</span>}
      {children !== undefined && <nav className="flex items-center gap-1">{children}</nav>}
      {trailing !== undefined && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </header>
  );
});
