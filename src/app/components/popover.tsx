/**
 * Popover — floating surface anchored to a trigger (shadcn baseline, compound parts).
 * @category Overlays
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=93-32
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
import { withHdsPortal } from '../context/hds-portal';

// ── Root + leaf primitives (re-exported from Radix) ────────────────────────────

// A wrapper of our own, not the Radix Root itself: the compound below attaches
// the parts to it. Writing them onto a component at module scope is a side
// effect webpack and esbuild keep in every bundle that reaches the shared
// chunk (hds#363, hds#365).
function PopoverRoot(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;
const PopoverPortal = /* @__PURE__ */ withHdsPortal(PopoverPrimitive.Portal);

// ── Content ────────────────────────────────────────────────────────────────────

/** @public */
export type PopoverContentProps = React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
> & {
  /**
   * Element to portal into. Defaults to the nearest `data-hds` scope, so the
   * overlay inherits its theme; pass `null` to use `document.body`.
   */
  container?: HTMLElement | null;
};

const PopoverContent = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(function PopoverContent(
  { className, align = 'center', sideOffset = 4, container, ...props },
  ref,
) {
  return (
    <PopoverPortal container={container}>
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
    </PopoverPortal>
  );
});

// ── Compound export ────────────────────────────────────────────────────────────

interface PopoverComponent extends React.FC<React.ComponentProps<typeof PopoverPrimitive.Root>> {
  Trigger: typeof PopoverTrigger;
  Anchor: typeof PopoverAnchor;
  Content: typeof PopoverContent;
  Close: typeof PopoverClose;
}

/**
 * Popover root + parts. Controlled via `open`/`onOpenChange`, or uncontrolled
 * with `defaultOpen`.
 * @usage Anchor interactive content, such as a short form, a filter set or a picker, to a trigger people click to open.
 * @whenNot A short label on hover or focus, a list of actions, or a decision that must block the page.
 * @useInstead Tooltip a short label shown on hover or focus
 * @useInstead Menu a list of actions
 * @useInstead Dialog a decision that blocks the page
 * @keyboard Enter/Space Opens the popover from the trigger and moves focus inside it.
 * @keyboard Escape Closes the popover and returns focus to the trigger.
 * @keyboard Tab Cycles focus inside the open popover; the page behind stays reachable.
 * @a11y component required a11y:popover.open-keys Enter and Space on the trigger open the popover.
 * @a11y component required a11y:popover.trigger-haspopup The trigger announces a dialog popup (aria-haspopup=dialog).
 * @a11y component required a11y:popover.trigger-expanded The trigger exposes aria-expanded, false while closed and true while open.
 * @a11y component required a11y:popover.trigger-controls The trigger points aria-controls at the open content.
 * @a11y component required a11y:popover.escape-returns-focus Escape closes the popover and returns focus to the trigger.
 * @a11y component required a11y:popover.content-role-dialog The open content is a role=dialog that takes the name the consumer gives it.
 * @a11y component required a11y:popover.tab-loop Tab cycles inside the open content instead of walking the page behind it (Radix default).
 * @a11y component required a11y:popover.non-modal The page behind stays reachable: no aria-hidden and no pointer-events lock.
 * @a11y consumer required Give Popover.Content an aria-label or aria-labelledby; the open dialog is otherwise unnamed.
 * @a11y consumer required Give an icon-only Popover.Trigger an aria-label.
 * @public
 */
const Popover: PopoverComponent = /* @__PURE__ */ Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Anchor: PopoverAnchor,
  Content: PopoverContent,
  Close: PopoverClose,
  // Set here, not by a later `Popover.displayName = …` write: a top-level
  // property write is a side effect that keeps the module alive.
  displayName: 'Popover',
});

export { Popover };
