/**
 * Cluster — wrapping horizontal group with even gaps.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves the "row of same-ish things that wraps gracefully" problem
 * (tag rows, button groups, chip lists, filter pills) with a single flex-wrap
 * wrapper and a tokenized gap in both axes, so agents stop hand-rolling
 * `flexWrap` + `gap` + alignment combinations inline.
 * @ai-rules Reach for this named layout intent before Box/sx. Use Cluster for
 * horizontal groups that should wrap as a unit. Spacing MUST use semantic
 * steps, never raw px. Do NOT use Cluster for a strict single-line row — use
 * Stack with `direction="row"` when wrapping is never desired. Do NOT use
 * Cluster for two-dimensional grid layouts — use Grid.
 *
 * Every Layout reference: https://every-layout.dev/layouts/cluster/
 */

import React from 'react';

type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';
type ClusterAlign = 'start' | 'center' | 'end' | 'stretch';
type ClusterJustify = 'start' | 'center' | 'end' | 'space-between';

const gapMap: Record<LayoutGap, string> = {
  tight: 'var(--semantic-space-layout-tight)',
  normal: 'var(--semantic-space-layout-normal)',
  inset: 'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

const alignMap: Record<ClusterAlign, React.CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const justifyMap: Record<ClusterJustify, React.CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
};

interface ClusterProps {
  /** Cluster content — items that wrap as a unit. */
  children: React.ReactNode;
  /** Gap token applied to both axes (row and column). Defaults to 'tight'. */
  gap?: LayoutGap;
  /** Cross-axis alignment of items within a wrapped row. Defaults to 'center'. */
  align?: ClusterAlign;
  /** Main-axis distribution. Defaults to 'start'. */
  justify?: ClusterJustify;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Cluster = React.forwardRef<HTMLDivElement, ClusterProps>(function Cluster(
  {
    children,
    gap = 'tight',
    align = 'center',
    justify = 'start',
    className,
    style,
    as: Tag = 'div',
  },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Cluster"
      data-hds-metrics={`gap:${gap}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: gapMap[gap],
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        ...style,
      }}
    >
      {children}
    </Tag>
  );
});
