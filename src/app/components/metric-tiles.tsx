/**
 * MetricTiles - the default row of headline numbers on a screen.
 * @category Display
 * @tier pattern
 */

import * as React from 'react';
import { Card } from './card';
import { Grid } from './grid';
import { Surface } from './surface';

/** Fixed feedback vocabulary for the value colour. */
export type MetricTileTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** Widest a row of tiles gets; a fifth tile wraps to a second row, never a narrower tile. */
const MAX_COLUMNS = 4;

/**
 * The one tile height. Every tile in every row is at least this tall, whatever
 * its tone and whether or not it has a sub line, so tiles line up across rows
 * and across screens. 120px, expressed from size tokens.
 */
const TILE_MIN_HEIGHT = 'calc(var(--primitive-size-96) + var(--primitive-size-24))';

/** A non-breaking space keeps the sub line's height when there is no sub text. */
const EMPTY_SUB = ' ';

/** @public */
export interface MetricTileProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Eyebrow label (for example "Open tasks"). */
  label: React.ReactNode;
  /** The headline number, set in the `heading2` type style. */
  value: React.ReactNode;
  /** Caption beneath the value. Its line is reserved even when this is absent. */
  sub?: React.ReactNode;
  /** Colours the value from the feedback vocabulary. Defaults to neutral. */
  tone?: MetricTileTone;
}

/**
 * One metric tile: eyebrow label, `heading2` value, caption sub line, on a raised
 * surface at one fixed min-height. Wraps `Card.Metric` (the sibling with the
 * eyebrow / h2 / caption scale) and adds the surface and the fixed height, so a
 * tile needs no enclosing `Card`.
 */
export const MetricTile = /* @__PURE__ */ React.forwardRef<HTMLDivElement, MetricTileProps>(
  function MetricTile({ label, value, sub, tone = 'neutral', style, ...props }, ref) {
    return (
      <Surface
        ref={ref}
        padding="item"
        data-hds-component="MetricTile"
        data-tone={tone}
        style={{ minHeight: TILE_MIN_HEIGHT, ...style }}
        {...props}
      >
        <Card.Metric
          label={label}
          value={value}
          sub={sub ?? EMPTY_SUB}
          tone={tone}
          className="px-0"
        />
      </Surface>
    );
  },
);

/** @public */
export interface MetricTilesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** `MetricTile` children. Fragments are looked through when counting tiles. */
  children: React.ReactNode;
}

/** Count valid elements, looking through fragments so wrapped tiles still count. */
function countTiles(children: React.ReactNode): number {
  return React.Children.toArray(children).reduce<number>((total, child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return total;
    return child.type === React.Fragment ? total + countTiles(child.props.children) : total + 1;
  }, 0);
}

/**
 * A row of `MetricTile`s. The grid has `min(tiles, 4)` columns, so three tiles
 * fill three columns and never leave an empty fourth. The default for any row of
 * headline numbers on a screen; use `Stat` only for an inline number inside prose
 * or a dense list, `Card.Metric` only inside an existing `Card`, and `StatusTile`
 * for state with notes (never a number).
 * @screenPattern
 */
export const MetricTiles = /* @__PURE__ */ React.forwardRef<HTMLDivElement, MetricTilesProps>(
  function MetricTiles({ children, ...props }, ref) {
    const columns = Math.min(Math.max(countTiles(children), 1), MAX_COLUMNS);
    return (
      <div ref={ref} data-hds-component="MetricTiles" {...props}>
        <Grid columns={columns} gap="tight">
          {children}
        </Grid>
      </div>
    );
  },
);
