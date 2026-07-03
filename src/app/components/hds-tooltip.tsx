/**
 * HdsTooltip — accessible hover/focus tooltip (shadcn baseline, Radix-backed).
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix Tooltip (@radix-ui/react-tooltip) themed with role tokens. Provides
 * hover + keyboard-focus triggering, ESC dismissal, collision-aware positioning,
 * portal mounting, and `role="tooltip"` + `aria-describedby` wiring out of the
 * box. Distinct from the @internal image-expand `Tooltip` in tooltip.tsx.
 *
 *   <HdsTooltip content="Copy to clipboard">
 *     <IconButton icon={Copy} aria-label="Copy" />
 *   </HdsTooltip>
 *
 * Bubble uses the inverse surface (`bg-foreground` / `text-background`) so it
 * reads as an ephemeral hint, not a persistent overlay like Popover/Dialog.
 * Each instance carries its own Provider so it is drop-in without app-level
 * setup; wrap a subtree in `HdsTooltipProvider` to share delay timing.
 */
// motion-ok: Radix Tooltip manages open/close mounting; the trigger is a styling
// passthrough (asChild) and adds no interactive surface of its own.

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

/** @public — shared provider to coordinate delay timing across many tooltips. */
export const HdsTooltipProvider = TooltipPrimitive.Provider;

export interface HdsTooltipProps {
  /** Content rendered inside the tooltip bubble. */
  content: React.ReactNode;
  /** Trigger element; rendered via `asChild` so it keeps its own semantics. */
  children: React.ReactNode;
  /** Preferred side of the trigger to anchor on. */
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>['side'];
  /** Alignment along the trigger edge. */
  align?: React.ComponentProps<typeof TooltipPrimitive.Content>['align'];
  /** Gap between trigger and bubble, in px. */
  sideOffset?: number;
  /** Delay before the tooltip opens on hover, in ms. */
  delayDuration?: number;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Open-state change callback. */
  onOpenChange?: (open: boolean) => void;
  /** Class hook for the bubble. */
  className?: string;
}

/** @public */
export const HdsTooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  HdsTooltipProps
>(function HdsTooltip(
  {
    content,
    children,
    side = 'top',
    align = 'center',
    sideOffset = 6,
    delayDuration = 200,
    open,
    defaultOpen,
    onOpenChange,
    className,
  },
  ref,
) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            ref={ref}
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={8}
            className={cn(
              'z-50 max-w-xs select-none rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-overlay outline-none',
              className,
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-foreground" width={11} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
});
