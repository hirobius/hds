/**
 * @category Display
 * @tier pattern
 * @ai-rules No status dots: the row has no leading circle and no tone. Status lives in the title, the notes or a text Badge in `trailing`.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=88-350
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface StatusListItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  notes?: React.ReactNode[];
  trailing?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Title row with optional muted notes and a trailing slot (e.g. a text Badge).
 * Non-interactive. It had a tone-coloured leading dot until hds#759: status is
 * carried by the text, so neither the dot nor `tone` remain.
 */
export const StatusListItem = /* @__PURE__ */ React.forwardRef<HTMLDivElement, StatusListItemProps>(
  function StatusListItem({ title, notes, trailing, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex items-start gap-3', className)} {...props}>
        <div className="min-w-0 flex-1">
          <p className="m-0 hds-type-ui text-foreground">{title}</p>
          {notes?.map((note, i) => (
            <p key={i} className="m-0 hds-type-caption text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    );
  },
);
