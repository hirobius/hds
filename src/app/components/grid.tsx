/**
 * Grid — responsive grid composition primitive.
 * @category Layout
 * @tier primitive
 * @usage Lay out content in responsive columns with token-governed gaps, or align nested content with subgrid.
 * @whenNot A single row or column, or styling a surface.
 * @useInstead Stack a single row or column
 * @useInstead Box one-off layout that no named primitive covers
 * @ai-intent Solves multi-column layout and repeatable alignment with token-governed gaps, responsive column collapse, and a first-class subgrid escape hatch for nested structure.
 * @ai-rules Use Grid for spatial layout, not for surface styling or content padding. Do NOT apply background, border, or internal padding directly to Grid to mimic a card. Do NOT use arbitrary CSS grid templates when fixed, auto-fit, auto-fill, or subgrid modes already express the layout. Do NOT use Grid for simple one-dimensional stacks where Stack is sufficient.
 *
 * Enforces semantic gap and column values. No arbitrary CSS grid.
 * - layout='fixed':   responsive base (collapses via CSS at tablet/mobile).
 *                     `columns` sets desktop count (default 12). Tablet/mobile
 *                     clamp to min(8, cols) and min(4, cols) respectively.
 * - layout='auto-fit': responsive card wrapping via auto-fit.
 * - layout='auto-fill': tile wrapping at `minItemWidth` (TileGrid's recipe).
 * - subgrid=true:     sets gridTemplateColumns:'subgrid' for nested alignment.
 *
 * Usage (default responsive 12-col):
 *   <Grid>
 *     <Grid.Item colSpan={6}>…</Grid.Item>
 *     <Grid.Item colSpan={6}>…</Grid.Item>
 *   </Grid>
 *
 * Usage (responsive auto-fit):
 *   <Grid layout="auto-fit">
 *     <Card />
 *     <Card />
 *   </Grid>
 */

'use client';

import React, { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import hds from '../design-system/tokens';
import { LAYOUT_GAP, resolveSpacingValue } from './box-sx';

type SemanticGap = 'medium' | 'tight' | 'normal' | 'inset' | 'spacious';
type GridLayout = 'fixed' | 'auto-fit' | 'auto-fill';

/** Grid's own props, plus any HTML attribute (role, aria-*, id) for its root element. */
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Grid content. */
  children: ReactNode;
  /** Grid layout mode: 'fixed' (responsive), 'auto-fit' (card wrapping) or 'auto-fill' (tile wrapping that keeps empty tracks). Defaults to 'fixed'. */
  layout?: GridLayout;
  /** Minimum item width before 'auto-fit' or 'auto-fill' wraps, capped at the container width. Defaults to 280px. */
  minItemWidth?: string;
  /** Desktop column count for layout='fixed'. Tablet clamps to min(8,n), mobile to min(4,n). Defaults to 12. */
  columns?: number;
  /** Gap between grid items: semantic only. 'medium' is a fixed 12px. Defaults to 'inset' (32px). */
  gap?: SemanticGap;
  /** If true, sets gridTemplateColumns:'subgrid' for nested grid alignment. */
  subgrid?: boolean;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: CSSProperties;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

export interface GridItemProps {
  children: ReactNode;
  /** Number of columns this item spans (out of the grid's column count). */
  colSpan?: number;
  /** Starting column position (1-based). */
  colOffset?: number;
  /** Escape hatch: only use for item-level adjustments that do not belong in the primitive API. */
  style?: CSSProperties;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Element rendered as the grid item wrapper. */
  as?: React.ElementType;
}

const GridItem = /* @__PURE__ */ React.forwardRef<HTMLDivElement, GridItemProps>(function GridItem(
  { children, colSpan, colOffset, style, className, as: Tag = 'div' },
  ref,
) {
  const itemStyle: CSSProperties = {
    ...(colSpan !== undefined && { gridColumn: `span min(var(--current-cols, 12), ${colSpan})` }),
    ...(colOffset !== undefined && { gridColumnStart: colOffset }),
    height: '100%',
    minWidth: 0,
    ...style,
  };
  return (
    <Tag ref={ref} className={className} style={itemStyle} data-hds-grid-item="true">
      {children}
    </Tag>
  );
});

/** The item width 'auto-fit' and 'auto-fill' wrap at when `minItemWidth` is not set. */
const DEFAULT_MIN_ITEM_WIDTH = '280px';

function getResponsiveColumns(width: number, columns: number) {
  if (width <= hds.breakpoints.sm) {
    return Math.min(4, columns);
  }

  if (width <= hds.breakpoints.lg) {
    return Math.min(8, columns);
  }

  return columns;
}

const GridInner = /* @__PURE__ */ React.forwardRef<HTMLDivElement, GridProps>(function Grid(
  {
    children,
    layout = 'fixed',
    minItemWidth,
    columns = 12,
    gap = 'inset',
    subgrid = false,
    style,
    className,
    as: Tag = 'div',
    ...rest
  },
  ref,
) {
  const isFixedLayout = layout === 'fixed' && !subgrid;
  const [currentColumns, setCurrentColumns] = useState(columns);

  useEffect(() => {
    if (!isFixedLayout || typeof window === 'undefined') return;

    const updateColumns = () => {
      setCurrentColumns(getResponsiveColumns(window.innerWidth, columns));
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);

    return () => {
      window.removeEventListener('resize', updateColumns);
    };
  }, [columns, isFixedLayout]);

  let gridTemplateColumns: string | undefined;

  if (subgrid) {
    gridTemplateColumns = 'subgrid';
  } else if (layout === 'auto-fit' && minItemWidth === undefined) {
    // The track auto-fit has always rendered, kept byte for byte (hds#393).
    gridTemplateColumns = `repeat(auto-fit, minmax(${DEFAULT_MIN_ITEM_WIDTH}, 1fr))`;
  } else if (layout === 'auto-fit' || layout === 'auto-fill') {
    // min() caps the track at the container, so a narrow container gets one full-width column.
    gridTemplateColumns = `repeat(${layout}, minmax(min(${minItemWidth ?? DEFAULT_MIN_ITEM_WIDTH}, 100%), 1fr))`;
  } else {
    gridTemplateColumns = `repeat(${currentColumns}, minmax(0, 1fr))`;
  }

  const gridStyle = {
    display: 'grid',
    alignItems: 'stretch',
    ...(gridTemplateColumns !== undefined && { gridTemplateColumns }),
    ...(isFixedLayout && {
      '--current-cols': String(currentColumns),
    }),
    gap: resolveSpacingValue(gap, LAYOUT_GAP),
    ...style,
  } as CSSProperties;

  return (
    <Tag
      {...rest}
      ref={ref}
      className={className}
      style={gridStyle}
      data-hds-grid="true"
      data-hds-component="Grid"
      data-hds-metrics={`gap:${gap}`}
    >
      {children}
    </Tag>
  );
});

/** @public */
export const Grid = /* @__PURE__ */ Object.assign(GridInner, { Item: GridItem });
