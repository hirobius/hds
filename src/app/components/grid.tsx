/**
 * Grid — responsive grid composition primitive.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves multi-column layout and repeatable alignment with token-governed gaps, responsive column collapse, and a first-class subgrid escape hatch for nested structure.
 * @ai-rules Use Grid for spatial layout, not for surface styling or content padding. Do NOT apply background, border, or internal padding directly to Grid to mimic a card. Do NOT use arbitrary CSS grid templates when fixed, auto-fit, or subgrid modes already express the layout. Do NOT use Grid for simple one-dimensional stacks where Stack is sufficient.
 *
 * Enforces semantic gap and column values. No arbitrary CSS grid.
 * - layout='fixed':   responsive base (collapses via CSS at tablet/mobile).
 *                     `columns` sets desktop count (default 12). Tablet/mobile
 *                     clamp to min(8, cols) and min(4, cols) respectively.
 * - layout='auto-fit': responsive card wrapping via auto-fit.
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

type SemanticGap = 'tight' | 'normal' | 'inset' | 'spacious';
type GridLayout = 'fixed' | 'auto-fit';

const gapMap: Record<SemanticGap, string> = {
  tight:    'var(--semantic-space-layout-tight)',
  normal:   'var(--semantic-space-layout-normal)',
  inset:    'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

interface GridProps {
  /** Grid content. */
  children: ReactNode;
  /** Grid layout mode: 'fixed' (responsive) or 'auto-fit' (card wrapping). Defaults to 'fixed'. */
  layout?: GridLayout;
  /** Desktop column count for layout='fixed'. Tablet clamps to min(8,n), mobile to min(4,n). Defaults to 12. */
  columns?: number;
  /** Gap between grid items: semantic only. Defaults to 'inset' (32px). */
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

interface GridItemProps {
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

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  function GridItem({ children, colSpan, colOffset, style, className, as: Tag = 'div' }, ref) {
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
  },
);

function getResponsiveColumns(width: number, columns: number) {
  if (width <= hds.breakpoints.sm) {
    return Math.min(4, columns);
  }

  if (width <= hds.breakpoints.lg) {
    return Math.min(8, columns);
  }

  return columns;
}

const GridInner = React.forwardRef<HTMLDivElement, GridProps>(
  function Grid(
    { children, layout = 'fixed', columns = 12, gap = 'inset', subgrid = false, style, className, as: Tag = 'div' },
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
    } else if (layout === 'auto-fit') {
      gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
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
      gap: gapMap[gap],
      ...style,
    } as CSSProperties;

    return (
      <Tag
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
  },
);

/** @public */
export const Grid = Object.assign(GridInner, { Item: GridItem });

