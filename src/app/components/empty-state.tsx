/**
 * EmptyState — consistent no-data placeholder for lists, grids, and sections.
 * @category Display
 * @tier primitive
 * @usage Say that a list, grid or section has no data yet, with a title, an optional description, and an optional action that teaches the next step.
 * @whenNot Content that is still loading, or a full-page error.
 * @useInstead Skeleton content that is still loading
 * @useInstead Alert a message about something that went wrong
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=88-352
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
  /** Optional action that fills the space, rendered under the description. */
  action?: React.ReactNode;
  /** Escape hatch for layout adjustments — token-only, no business logic. */
  className?: string;
}

/** @public */
export const EmptyState = /* @__PURE__ */ React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState({ title, description, action, className }, ref) {
    return (
      <div
        ref={ref}
        data-hds-component="EmptyState"
        className={cn('flex flex-col gap-1 hds-type-ui italic text-muted-foreground', className)}
      >
        <p className="m-0">{title}</p>
        {description && <p className="m-0 not-italic hds-type-caption">{description}</p>}
        {/* not-italic: the root is italic for the message; the action opts back
            out so a button or link inside keeps its own type style. The wrapper
            also keeps the action at its natural width instead of stretching. */}
        {action && <div className="not-italic">{action}</div>}
      </div>
    );
  },
);
