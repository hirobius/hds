/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The X close button that Dialog.Content and Sheet.Content (sheet.tsx) both
 * render in their top-right padding: its colours, hover fill, focus ring, icon
 * and "Close" label. Each file still passes the button's box and hit area
 * (position, size and `hds-touch-target`) as `placement`, and any extra classes
 * as `className`. Local to the two files (hds#1009).
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface OverlayCloseProps {
  /** Position, size and touch target. These come first in the class list. */
  placement: string;
  /** Extra classes, appended last. */
  className?: string;
}

export function OverlayClose({ placement, className }: OverlayCloseProps) {
  return (
    <DialogPrimitive.Close
      className={cn(
        placement,
        'items-center justify-center rounded-sm text-muted-foreground transition-colors',
        // Hover steps to surface.sunken: `bg-accent` was 1.10:1 on the white popover in light (hds#522).
        'hover:bg-[var(--semantic-color-surface-sunken)] hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <X aria-hidden="true" className="size-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  );
}
