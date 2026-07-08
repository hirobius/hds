/**
 * Switcher — flips a row to a column below a width threshold, no media query.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves "horizontal row of peer items that should become a
 * vertical stack once the container gets narrow" without a breakpoint or a
 * resize observer, using the flex-basis calc() technique: each item's
 * flex-basis resolves to a huge negative or huge positive number depending on
 * whether the container is above or below `threshold`, forcing every item
 * onto its own line once it flips.
 * @ai-rules Reach for this named layout intent before Box/sx. gap MUST use a
 * semantic space step, never raw px. threshold is a CSS length dimension
 * (not spacing), e.g. '30rem'. `limit` unconditionally forces the stacked
 * (column) layout once there are more than `limit` children, regardless of
 * container width — use it to stop a row from thinning out into an
 * unreadable N-up strip. Do NOT use Switcher for content that should always
 * wrap in place — use Cluster.
 *
 * Every Layout reference: https://every-layout.dev/layouts/the-switcher/
 */

import React from 'react';

type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';

const gapMap: Record<LayoutGap, string> = {
  tight: 'var(--semantic-space-layout-tight)',
  normal: 'var(--semantic-space-layout-normal)',
  inset: 'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

interface SwitcherProps {
  /** Switcher content — peer items that flip between row and column as a unit. */
  children: React.ReactNode;
  /** Container width below which items stack vertically (CSS length, e.g. '30rem'). Defaults to '30rem'. */
  threshold?: string;
  /** Gap between items in both the row and the stacked layout. Defaults to 'normal'. */
  gap?: LayoutGap;
  /** Maximum number of children before the layout is unconditionally forced to stacked, regardless of width. */
  limit?: number;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Switcher = React.forwardRef<HTMLDivElement, SwitcherProps>(function Switcher(
  { children, threshold = '30rem', gap = 'normal', limit, className, style, as: Tag = 'div' },
  ref,
) {
  const items = React.Children.toArray(children);
  const forceStacked = limit !== undefined && items.length > limit;

  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Switcher"
      data-hds-metrics={`threshold:${threshold}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: gapMap[gap],
        ...(forceStacked && { flexDirection: 'column' }),
        ...style,
      }}
    >
      {items.map((child, i) => (
        <div
          key={i}
          style={
            forceStacked
              ? undefined
              : { flexGrow: 1, flexBasis: `calc((${threshold} - 100%) * 999)` }
          }
        >
          {child}
        </div>
      ))}
    </Tag>
  );
});
