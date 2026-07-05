/**
 * HdsHoverCard — rich preview shown on hover/focus, on Radix HoverCard.
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix HoverCard (@radix-ui/react-hover-card) themed with the overlay role
 * tokens to match Menu/Popover. For sighted-pointer preview affordances (user
 * cards, link previews) — it is NOT a replacement for an accessible tooltip on
 * an interactive control; use HdsTooltip for labelling.
 *
 *   <HdsHoverCard>
 *     <HdsHoverCard.Trigger asChild><InlineLink href="…">@ada</InlineLink></HdsHoverCard.Trigger>
 *     <HdsHoverCard.Content>Ada Lovelace — first programmer.</HdsHoverCard.Content>
 *   </HdsHoverCard>
 */
// motion-ok: Radix HoverCard manages open/close timing + portal mount; Content is a token styling passthrough.

import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { cn } from '../../lib/utils';

const HdsHoverCardRoot = HoverCardPrimitive.Root;
const HdsHoverCardTrigger = HoverCardPrimitive.Trigger;

// ── Content ─────────────────────────────────────────────────────────────────────

const HdsHoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(function HdsHoverCardContent({ className, align = 'center', sideOffset = 6, ...props }, ref) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-50 w-64 rounded-md border border-border bg-popover p-4 text-sm text-popover-foreground shadow-overlay hds-focus',
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
});

// ── Compound assembly ────────────────────────────────────────────────────────────

interface HdsHoverCardComponent extends React.FC<
  React.ComponentProps<typeof HoverCardPrimitive.Root>
> {
  Trigger: typeof HdsHoverCardTrigger;
  Content: typeof HdsHoverCardContent;
}

/**
 * HoverCard root + parts. Controlled via `open`/`onOpenChange`, or uncontrolled
 * with `defaultOpen`; tune timing with `openDelay`/`closeDelay`.
 * @public
 */
export const HdsHoverCard = HdsHoverCardRoot as unknown as HdsHoverCardComponent;
HdsHoverCard.Trigger = HdsHoverCardTrigger;
HdsHoverCard.Content = HdsHoverCardContent;
