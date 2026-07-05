/**
 * HoverCard — rich preview shown on hover/focus, on Radix HoverCard.
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix HoverCard (@radix-ui/react-hover-card) themed with the overlay role
 * tokens to match Menu/Popover. For sighted-pointer preview affordances (user
 * cards, link previews) — it is NOT a replacement for an accessible tooltip on
 * an interactive control; use HdsTooltip for labelling.
 *
 *   <HoverCard>
 *     <HoverCard.Trigger asChild><InlineLink href="…">@ada</InlineLink></HoverCard.Trigger>
 *     <HoverCard.Content>Ada Lovelace — first programmer.</HoverCard.Content>
 *   </HoverCard>
 */
// motion-ok: Radix HoverCard manages open/close timing + portal mount; Content is a token styling passthrough.

import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { cn } from '../../lib/utils';

const HoverCardRoot = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

// ── Content ─────────────────────────────────────────────────────────────────────

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(function HoverCardContent({ className, align = 'center', sideOffset = 6, ...props }, ref) {
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

interface HoverCardComponent extends React.FC<
  React.ComponentProps<typeof HoverCardPrimitive.Root>
> {
  Trigger: typeof HoverCardTrigger;
  Content: typeof HoverCardContent;
}

/**
 * HoverCard root + parts. Controlled via `open`/`onOpenChange`, or uncontrolled
 * with `defaultOpen`; tune timing with `openDelay`/`closeDelay`.
 * @public
 */
export const HoverCard = HoverCardRoot as unknown as HoverCardComponent;
HoverCard.Trigger = HoverCardTrigger;
HoverCard.Content = HoverCardContent;
