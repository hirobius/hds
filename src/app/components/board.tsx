/**
 * Board — read-only status columns (a kanban-style overview, no drag).
 * @category Layout
 * @tier primitive
 */

'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Grid } from './grid';
import { VisuallyHidden } from './visually-hidden';

/**
 * The narrowest a column gets. Grid's auto-fit wraps at this width, capped at the
 * container, so a narrow container (a phone, a side panel) gets one full-width
 * column and the rest stack beneath it in DOM order. The same rule sits in the
 * container, not the viewport, so a Board in a sidebar stacks too.
 */
const COLUMN_MIN_WIDTH = '16rem';

const HEADING_CLASS =
  'm-0 flex items-center gap-[var(--semantic-space-scale-xs)] border-b border-border pb-[var(--semantic-space-scale-xs)] hds-type-ui text-foreground';
const ITEMS_CLASS = 'flex flex-col gap-[var(--semantic-space-scale-sm)]';

const TONE_DOT = {
  neutral: 'bg-border',
  info: 'bg-feedback-info',
  success: 'bg-feedback-success',
  warning: 'bg-feedback-warning',
  danger: 'bg-feedback-danger',
} as const;

/** @public */
export type BoardColumnTone = keyof typeof TONE_DOT;

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
  /** Number of items in the column, shown and announced. Defaults to the number of children. */
  count?: number;
  /** Status colour of the column's dot, from the feedback vocabulary. Defaults to neutral. */
  tone?: BoardColumnTone;
  /** The column's cards or rows. The consumer owns their click and link behaviour. */
  children?: React.ReactNode;
}

/**
 * A row of status columns that wraps, in order, as the container narrows.
 * Read-only: it has no drag handlers.
 * @usage Show work grouped by status as side-by-side columns, each with a title, a count and a tone, such as leads by pipeline stage.
 * @whenNot Rows of columns and cells that sort or filter, or a board people rearrange by dragging.
 * @useInstead Table rows of data with sortable columns
 * @useInstead Grid a plain responsive layout with no status columns
 * @ai-intent Solves "group cards by status" with a heading, count and tone per column on a wrapping grid, so agents do not hand-roll a kanban with flex and media queries.
 * @ai-rules Put Card or Card.Row children inside BoardColumn and keep click and link handling on those children: Board owns layout only. Do NOT add drag and drop; Board is read-only. Do NOT wrap a BoardColumn in a Card or Surface (columns are open bands, not outlined cards). List columns in priority order: when the container is narrow they stack top to bottom in that same order.
 */
export const Board = /* @__PURE__ */ React.forwardRef<HTMLDivElement, BoardProps>(function Board(
  { children, className, ...rest },
  ref,
) {
  return (
    <div role="group" {...rest} ref={ref} className={className} data-hds-component="Board">
      <Grid layout="auto-fit" minItemWidth={COLUMN_MIN_WIDTH} gap="inset">
        {children}
      </Grid>
    </div>
  );
});

/**
 * One status column: a heading with the title, a count and a tone dot, then its items.
 * The column is a labelled region and the count is part of the heading's name.
 * @usage Hold the cards for one status inside a Board, with a heading that announces the count.
 * @whenNot Standing alone outside a Board, or a list with no status.
 * @useInstead Stack a plain vertical list
 */
export const BoardColumn = /* @__PURE__ */ React.forwardRef<HTMLElement, BoardColumnProps>(
  function BoardColumn({ title, count, tone = 'neutral', children, className, ...rest }, ref) {
    const headingId = React.useId();
    const total = count ?? React.Children.toArray(children).length;
    return (
      <section
        {...rest}
        ref={ref}
        aria-labelledby={headingId}
        data-hds-component="BoardColumn"
        data-tone={tone}
        className={cn('flex min-w-0 flex-col gap-[var(--semantic-space-scale-md)]', className)}
      >
        <h3 id={headingId} className={HEADING_CLASS}>
          <span
            aria-hidden="true"
            data-hds-board-dot=""
            className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])}
          />
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
