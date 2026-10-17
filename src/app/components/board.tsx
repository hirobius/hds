/**
 * Board — read-only status columns (a kanban-style overview, no drag).
 * @category Layout
 * @tier primitive
 */

'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { VisuallyHidden } from './visually-hidden';

/**
 * Layout, in the Board's own width (a container query), not the viewport, so a
 * Board in a side panel stacks too.
 * - Below tablet (`@3xl` = 48rem = 768px = `hds.breakpoints.md`): one column, the
 *   columns stack in DOM order.
 * - From tablet up: columns flow sideways, each at least 16rem, filling the row.
 *   Past that width the track scrolls horizontally inside the Board; it never
 *   wraps, so no column is orphaned on a second row.
 */
const ROOT_CLASS = '@container overflow-x-auto';
// arbitrary-ok: the 16rem column floor has no spacing token; it is the one width the Board owns, and the variant is a container query that tokens cannot express.
const TRACK_CLASS =
  'grid grid-cols-1 gap-[var(--semantic-space-layout-inset)] @3xl:grid-flow-col @3xl:auto-cols-[minmax(16rem,1fr)]';

const HEADING_CLASS =
  'm-0 flex items-center gap-[var(--semantic-space-scale-xs)] border-b border-border pb-[var(--semantic-space-scale-xs)] hds-type-ui text-foreground';
const ITEMS_CLASS = 'flex flex-col gap-[var(--semantic-space-scale-sm)]';

/** Drag and drop is not part of the Board contract. */
type NoDrag =
  | 'draggable'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop';

/** @public */
export interface BoardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, NoDrag> {
  /** `BoardColumn` children, in priority order. They stack in this order on a narrow container. */
  children: React.ReactNode;
}

/** @public */
export interface BoardColumnProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  NoDrag | 'title'
> {
  /** Column heading, for example "On fire". */
  title: React.ReactNode;
  /**
   * Number of items in the column, shown and announced. Defaults to the number of
   * direct children, so a wrapper element (a `<ul>` or `<div>`) counts
   * as 1. Pass `count` explicitly whenever the items are not direct children.
   */
  count?: number;
  /** The column's cards or rows. The consumer owns their click and link behaviour. */
  children?: React.ReactNode;
}

/**
 * Status columns that sit side by side from tablet width and stack in order, first column on top, below it.
 * Read-only: it has no drag handlers.
 * @usage Show work grouped by status as side-by-side columns, each with a title, a count, such as leads by pipeline stage.
 * @whenNot Rows of columns and cells that sort or filter, or a board people rearrange by dragging.
 * @useInstead Table rows of data with sortable columns
 * @useInstead Grid a plain responsive layout with no status columns
 * @ai-intent Solves "group cards by status" with a heading and count per column on a stacking-then-scrolling grid, so agents do not hand-roll a kanban with flex and media queries.
 * @ai-rules Put Card or Card.Row children inside BoardColumn and keep click and link handling on those children: Board owns layout only. Do NOT add drag and drop; Board is read-only. Do NOT wrap a BoardColumn in a Card or Surface (columns are open bands, not outlined cards). List columns in priority order: when the container is below tablet width they stack top to bottom in that same order.
 */
export const Board = /* @__PURE__ */ React.forwardRef<HTMLDivElement, BoardProps>(function Board(
  { children, className, ...rest },
  ref,
) {
  return (
    <div
      role="group"
      {...rest}
      ref={ref}
      className={cn(ROOT_CLASS, className)}
      data-hds-component="Board"
    >
      <div className={TRACK_CLASS} data-hds-board-track="">
        {children}
      </div>
    </div>
  );
});

/**
 * One status column: a heading with the title and a count, then its items.
 * The column is a labelled region and the count is part of the heading's name.
 * @usage Hold the cards for one status inside a Board, with a heading that announces the count.
 * @whenNot Standing alone outside a Board, or a list with no status.
 * @useInstead Stack a plain vertical list
 */
export const BoardColumn = /* @__PURE__ */ React.forwardRef<HTMLElement, BoardColumnProps>(
  function BoardColumn({ title, count, children, className, ...rest }, ref) {
    const headingId = React.useId();
    const total = count ?? React.Children.toArray(children).length;
    return (
      <section
        {...rest}
        ref={ref}
        aria-labelledby={headingId}
        data-hds-component="BoardColumn"
        className={cn('flex min-w-0 flex-col gap-[var(--semantic-space-scale-md)]', className)}
      >
        <h3 id={headingId} className={HEADING_CLASS}>
          <span>{title}</span>
          <span aria-hidden="true" className="hds-type-caption text-muted-foreground">
            {total}
          </span>
          <VisuallyHidden>{`, ${total} ${total === 1 ? 'item' : 'items'}`}</VisuallyHidden>
        </h3>
        <div className={ITEMS_CLASS}>{children}</div>
      </section>
    );
  },
);
