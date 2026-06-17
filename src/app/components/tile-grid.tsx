/**
 * @category Layout
 * @tier primitive
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

/** @public */
export interface TileGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum tile width before the grid wraps. Defaults to 260px. */
  minTileWidth?: string;
  /** Gap token between tiles. Defaults to 'sm' (12px). */
  gap?: 'xs' | 'sm' | 'md';
}

const GAP_PX: Record<NonNullable<TileGridProps['gap']>, string> = {
  xs: '8px',
  sm: '12px',
  md: '16px',
};

/**
 * Auto-fill responsive grid for status/micro tiles. Wraps tile children in a
 * one-line grid declaration so pages don't repeat the auto-fill minmax recipe.
 */
export const TileGrid = React.forwardRef<HTMLDivElement, TileGridProps>(
  function TileGrid({ minTileWidth = '260px', gap = 'sm', className, style, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-hds-component="TileGrid"
        className={cn(className)}
        style={{
          // eslint-disable-next-line no-restricted-syntax -- TileGrid IS the grid primitive; auto-fill template is its raison d'être
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(min(${minTileWidth}, 100%), 1fr))`, // grid-ok: auto-fill is inherently responsive (gate's regex doesn't recognize template literals)
          gap: GAP_PX[gap],
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
