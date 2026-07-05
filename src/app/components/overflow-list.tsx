/**
 * OverflowList — a horizontal list that caps visible children by count and
 * collapses the remainder into a trailing +N chip. Count-based (via `max`),
 * not width-measured, so layout is deterministic and safe under SSR and jsdom.
 * @category Layout
 * @tier pattern
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface OverflowListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Items to lay out. Extra items beyond `max` collapse into the overflow node. */
  children: React.ReactNode;
  /** Maximum items shown before collapsing into overflow. Unset or >= count shows all. */
  max?: number;
  /** Custom renderer for the overflow node. Defaults to a muted `+N` chip. */
  renderOverflow?: (count: number) => React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders up to `max` children followed by a `+N` overflow chip (or custom node). */
export const OverflowList = React.forwardRef<HTMLDivElement, OverflowListProps>(
  function OverflowList({ className, children, max, renderOverflow, ...props }, ref) {
    const items = React.Children.toArray(children).filter(React.isValidElement);
    const limit = max !== undefined && max >= 0 ? max : items.length;
    const visible = items.slice(0, limit);
    const overflow = items.length - visible.length;

    return (
      <div
        ref={ref}
        role="list"
        data-overflow={overflow}
        className={cn('flex items-center gap-2 flex-wrap', className)}
        {...props}
      >
        {visible.map((child, i) => (
          <div role="listitem" key={(child as React.ReactElement).key ?? i}>
            {child}
          </div>
        ))}
        {overflow > 0 &&
          (renderOverflow ? (
            renderOverflow(overflow)
          ) : (
            <span
              aria-label={`+${overflow} more`}
              className="inline-flex items-center rounded-md bg-muted px-2 h-6 text-sm font-medium text-muted-foreground"
            >
              +{overflow}
            </span>
          ))}
      </div>
    );
  },
);
