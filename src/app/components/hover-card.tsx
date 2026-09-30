/**
 * HoverCard — rich preview shown on hover/focus, on Radix HoverCard.
 * @category Overlays
 * @tier primitive
 * @usage Preview extra detail about a link or mention when it is hovered or focused, without navigating.
 * @whenNot Content people must reach, or a label for an interactive control.
 * @useInstead Dialog content people must act on
 * @useInstead Tooltip a short label for a control
 * @slot trigger The link or element that opens the card (HoverCard.Trigger).
 * @slot content The preview (HoverCard.Content).
 * @keyboard Focus Opens the card when the trigger receives keyboard focus.
 * @keyboard Escape Closes the card and keeps focus on the trigger.
 * @keyboard Tab Moves on to the next element and closes the card.
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix HoverCard (@radix-ui/react-hover-card) themed with the overlay role
 * tokens to match Menu/Popover. For sighted-pointer preview affordances (user
 * cards, link previews) — it is NOT a replacement for an accessible tooltip on
 * an interactive control; use Tooltip for labelling.
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
import { withHdsPortal } from '../context/hds-portal';

const HoverCardRoot = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;
const HoverCardPortal = withHdsPortal(HoverCardPrimitive.Portal);

// ── Content ─────────────────────────────────────────────────────────────────────

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & {
    /**
     * Element to portal into. Defaults to the nearest `data-hds` scope, so the
     * overlay inherits its theme; pass `null` to use `document.body`.
     */
    container?: HTMLElement | null;
  }
>(function HoverCardContent(
  { className, align = 'center', sideOffset = 6, container, ...props },
  ref,
) {
  return (
    <HoverCardPortal container={container}>
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
    </HoverCardPortal>
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
