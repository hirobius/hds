/**
 * EmptyState — consistent no-data placeholder for lists, grids, and sections.
 * @category Display
 * @tier primitive
 * @ai-intent Inline empty-state placeholder so any list, grid, or section can
 *   communicate "no data yet" with consistent muted typography instead of agents
 *   inventing one-off `<p>No items.</p>` lines.
 * @ai-rules Use only for inline empty states inside an existing section. Do NOT
 *   use for full-page errors (use ErrorPage) or for loading states (use a
 *   skeleton). Do NOT wrap in Surface or Card — the empty state is a
 *   typographic message, not a chrome-bearing container.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

/** @public */
export interface EmptyStateProps {
  /** Primary message. Sentence-case, no trailing period required. */
  title: React.ReactNode;
  /** Optional supporting line. */
  description?: React.ReactNode;
  /** Escape hatch for layout adjustments — token-only, no business logic. */
  className?: string;
}

/** @public */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { title, description, className },
  ref,
) {
  return (
    <div
      ref={ref}
      data-hds-component="EmptyState"
      className={cn('flex flex-col gap-1 text-sm italic text-muted-foreground', className)}
    >
      <p className="m-0">{title}</p>
      {description && <p className="m-0 not-italic text-xs">{description}</p>}
    </div>
  );
});
