/**
 * Sidebar — fixed-width rail beside fluid content, no media query.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves the "rail + fluid content that stacks below a threshold"
 * problem with the flex-basis/flex-grow disparity technique — the rail holds
 * `sideWidth` and the content flex-basis 0 with an overwhelming flex-grow, so
 * the pair wraps to stacked automatically once the container can no longer
 * fit both without squeezing content below `contentMin`. No `@media` query,
 * no JS resize observer.
 * @ai-rules Reach for this named layout intent before Box/sx. Sidebar expects
 * EXACTLY two children — the rail and the content — passed in that order.
 * `side` controls which one visually renders as the rail; DOM order is
 * unchanged. gap MUST use a semantic space step, never raw px. sideWidth and
 * contentMin are CSS length dimensions (not spacing) — a length string like
 * '16rem' or '50%' is expected, matching the check-hardcoded-spacing gate's
 * own dimension-prop exemption. Do NOT use Sidebar for more than two regions
 * — use Grid.
 *
 * Every Layout reference: https://every-layout.dev/layouts/sidebar/
 */

import React from 'react';

type SidebarSide = 'start' | 'end';
type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';

const gapMap: Record<LayoutGap, string> = {
  tight: 'var(--semantic-space-layout-tight)',
  normal: 'var(--semantic-space-layout-normal)',
  inset: 'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

interface SidebarProps {
  /** Exactly two children: the rail first, the fluid content second (DOM order — `side` only changes visual order). */
  children: [React.ReactNode, React.ReactNode];
  /** Which visual edge the rail renders on. Defaults to 'start'. */
  side?: SidebarSide;
  /** Fixed width of the rail (CSS length, e.g. '16rem'). Defaults to '16rem'. */
  sideWidth?: string;
  /** Minimum inline size the content is allowed to shrink to before the pair wraps to stacked (CSS length). Defaults to '50%'. */
  contentMin?: string;
  /** Gap between the rail and the content, and between the two once stacked. Defaults to 'normal'. */
  gap?: LayoutGap;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(function Sidebar(
  {
    children,
    side = 'start',
    sideWidth = '16rem',
    contentMin = '50%',
    gap = 'normal',
    className,
    style,
    as: Tag = 'div',
  },
  ref,
) {
  const [rail, content] = children;

  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Sidebar"
      data-hds-metrics={`side:${side}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: gapMap[gap],
        ...style,
      }}
    >
      <div style={{ flexBasis: sideWidth, flexGrow: 1, order: side === 'end' ? 2 : 1 }}>{rail}</div>
      <div
        style={{ flexBasis: 0, flexGrow: 999, minWidth: contentMin, order: side === 'end' ? 1 : 2 }}
      >
        {content}
      </div>
    </Tag>
  );
});
