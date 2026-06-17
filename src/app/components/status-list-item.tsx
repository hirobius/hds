/**
 * @category Display
 * @tier pattern
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

const DOT_TONE = {
  success: 'bg-[var(--semantic-color-feedback-success)]',
  warning: 'bg-[var(--semantic-color-feedback-warning)]',
  danger:  'bg-[var(--semantic-color-feedback-error)]',
  info:    'bg-[var(--semantic-color-content-accent)]',
  neutral: 'bg-[var(--semantic-color-border-default)]',
} as const;

export type StatusListItemTone = keyof typeof DOT_TONE;

/** @public */
export interface StatusListItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: StatusListItemTone;
  title: React.ReactNode;
  notes?: React.ReactNode[];
  trailing?: React.ReactNode;
}

/**
 * Status dot + title row with optional muted notes and trailing slot (e.g. badge).
 */
export const StatusListItem = React.forwardRef<HTMLDivElement, StatusListItemProps>(
  function StatusListItem({ tone = 'neutral', title, notes, trailing, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex items-start gap-3', className)} {...props}>
        <span aria-hidden="true" className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOT_TONE[tone])} />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm text-foreground">{title}</p>
          {notes?.map((note, i) => (
            <p key={i} className="m-0 text-xs text-muted-foreground">{note}</p>
          ))}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    );
  },
);
