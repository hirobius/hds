/**
 * Popover — floating surface anchored to a trigger (shadcn baseline, compound parts).
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix Popover (@radix-ui/react-popover) themed with role tokens. Provides
 * focus management, outside-click + ESC dismissal, collision-aware positioning,
 * and portal mounting out of the box.
 *
 *   <Popover>
 *     <Popover.Trigger asChild>
 *       <Button>Open</Button>
 *     </Popover.Trigger>
 *     <Popover.Content>
 *       …content…
 *     </Popover.Content>
 *   </Popover>
 *
 * Surface uses role.popover (semantic.color.surface.overlay via the `popover`
 * token) + shadow-overlay. Mirrors Dialog's surface treatment so overlays read
 * as one family.
 */
// motion-ok: Radix Popover manages open/close mounting; the trigger is a styling
// passthrough (asChild) and adds no interactive surface of its own.

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../lib/utils';

// ── Root + leaf primitives (re-exported from Radix) ────────────────────────────

const PopoverRoot = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

// ── Content ────────────────────────────────────────────────────────────────────

/** @public */
export type PopoverContentProps = React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
>;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(function PopoverContent({ className, align = 'center', sideOffset = 4, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-50 w-72 rounded-md border border-border bg-popover p-4',
          'text-popover-foreground shadow-overlay outline-none hds-focus',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

// ── Compound export ────────────────────────────────────────────────────────────

interface PopoverComponent
  extends React.FC<React.ComponentProps<typeof PopoverPrimitive.Root>> {
  Trigger: typeof PopoverTrigger;
  Anchor: typeof PopoverAnchor;
  Content: typeof PopoverContent;
  Close: typeof PopoverClose;
}

/**
 * Popover root + parts. Controlled via `open`/`onOpenChange`, or uncontrolled
 * with `defaultOpen`.
 * @public
 */
const Popover = ((props: React.ComponentProps<typeof PopoverPrimitive.Root>) => (
  <PopoverRoot {...props} />
)) as PopoverComponent;
Popover.Trigger = PopoverTrigger;
Popover.Anchor = PopoverAnchor;
Popover.Content = PopoverContent;
Popover.Close = PopoverClose;

export { Popover };
