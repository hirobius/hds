/**
 * @category Display
 * @tier pattern
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

export type StatusTileTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** @public */
export interface StatusTileProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Tone metadata kept for downstream consumers (e.g., the trailing badge). The tile itself does not paint a tone-bearing rule. */
  tone?: StatusTileTone;
  title: React.ReactNode;
  notes?: React.ReactNode[];
  trailing?: React.ReactNode;
}

/**
 * Block-layout sibling of StatusListItem. Renders a raised surface tile with
 * title, optional muted notes, and a trailing slot for a badge or affordance.
 * Status colour belongs in the trailing slot, never as a left rule on the tile
 * — every tile should look the same so feedback signals stay reserved for
 * genuinely interrupting states.
 */
export const StatusTile = React.forwardRef<HTMLDivElement, StatusTileProps>(
  function StatusTile({ tone = 'neutral', title, notes, trailing, className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-hds-component="StatusTile"
        data-hds-metrics={`tone:${tone}`}
        className={cn(
          'flex h-full items-start gap-3 rounded-[var(--component-card-radius)] bg-[var(--semantic-color-surface-raised)] p-4',
          className,
        )}
        {...props}
      >
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm text-foreground">{title}</p>
          {notes?.map((note, i) => (
            <p key={i} className="m-0 mt-1 text-xs text-muted-foreground">{note}</p>
          ))}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    );
  },
);
