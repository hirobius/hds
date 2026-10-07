/**
 * Dialog — modal dialog (shadcn baseline, compound parts).
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when /ops/hds/components/overlays is created
 *
 * shadcn-baseline implementation (8s-7): Radix Dialog primitive
 * (@radix-ui/react-dialog) themed with role tokens. Provides focus
 * trap, scroll lock, ESC-to-close, backdrop scrim, and portal
 * mounting out of the box.
 *
 *   <Dialog>
 *     <Dialog.Trigger asChild>
 *       <Button>Open</Button>
 *     </Dialog.Trigger>
 *     <Dialog.Content>
 *       <Dialog.Header>
 *         <Dialog.Title>Confirm</Dialog.Title>
 *         <Dialog.Description>Are you sure?</Dialog.Description>
 *       </Dialog.Header>
 *       <Dialog.Footer>
 *         <Dialog.Close asChild>
 *           <Button variant="secondary">Cancel</Button>
 *         </Dialog.Close>
 *       </Dialog.Footer>
 *     </Dialog.Content>
 *   </Dialog>
 *
 * Surface uses role.popover (semantic.color.surface.overlay) +
 * shadow-overlay (semantic.shadow.overlay from 8e-1). The scrim is
 * role.scrim (semantic.color.surface.scrim) at 60% alpha: dark in both
 * themes, black in dark mode. The overlay portals into the nearest
 * `data-hds` scope so it inherits the active theme; pass `container` to
 * override. The close affordance is rendered as an absolutely-positioned
 * X inside Content; pass `hideClose` to opt out for fully-custom layouts.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { withHdsPortal } from '../context/hds-portal';
import { Text } from './text';

// ── Root + leaf primitives (re-exported from Radix) ────────────────────────────

const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = /* @__PURE__ */ withHdsPortal(DialogPrimitive.Portal);
const DialogClose = DialogPrimitive.Close;

// ── Overlay (scrim) ────────────────────────────────────────────────────────────

const DialogOverlay = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-scrim/60 backdrop-blur-sm', className)}
      {...props}
    />
  );
});

// ── Content ────────────────────────────────────────────────────────────────────

/** @public */
export interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /** Hide the built-in close affordance. Useful for fully custom layouts. */
  hideClose?: boolean;
  /**
   * Element to portal into. Defaults to the nearest `data-hds` scope, so the
   * overlay inherits its theme; pass `null` to use `document.body`.
   */
  container?: HTMLElement | null;
}

const DialogContent = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent({ className, children, hideClose = false, container, ...props }, ref) {
  return (
    <DialogPortal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // 16px of page margin each side, so the panel never sits flush to a 390px viewport (hds#522)
          'fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2*var(--semantic-space-scale-sm))] max-h-[calc(100dvh-2*var(--semantic-space-scale-sm))] max-w-lg overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-overlay hds-focus',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:pointer-events-none',
            )}
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

// ── Layout parts ───────────────────────────────────────────────────────────────

const DialogHeader = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DialogHeader({ className, ...props }, ref) {
  return (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
  );
});

const DialogFooter = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DialogFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  );
});

const DialogTitle = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, children, ...props }, ref) {
  // D1: Text owns the type ramp; asChild keeps Radix's Title a11y wiring (the
  // id that backs aria-labelledby) on the heading element.
  return (
    <DialogPrimitive.Title asChild>
      <Text ref={ref} as="h2" variant="title" className={className} {...props}>
        {children}
      </Text>
    </DialogPrimitive.Title>
  );
});

const DialogDescription = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, children, ...props }, ref) {
  return (
    <DialogPrimitive.Description asChild>
      <Text
        ref={ref}
        as="p"
        variant="caption"
        className={cn('text-muted-foreground', className)}
        {...props}
      >
        {children}
      </Text>
    </DialogPrimitive.Description>
  );
});

// ── Compound assembly ─────────────────────────────────────────────────────────

export interface DialogProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** When true (default), traps focus and locks scroll while open. */
  modal?: boolean;
  /** Children — typically `Dialog.Trigger` and `Dialog.Content`. */
  children?: React.ReactNode;
}

// A wrapper of our own, not the Radix Root itself: the compound below attaches
// the parts to it. Attaching them to `DialogPrimitive.Root` compiled to
// property writes on a third-party export, which webpack and esbuild keep in
// every bundle that reaches the shared chunk (hds#363).
function DialogRoot(props: DialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

interface DialogComponent extends React.FC<DialogProps> {
  Trigger: typeof DialogTrigger;
  Portal: typeof DialogPortal;
  Overlay: typeof DialogOverlay;
  Content: typeof DialogContent;
  Header: typeof DialogHeader;
  Footer: typeof DialogFooter;
  Title: typeof DialogTitle;
  Description: typeof DialogDescription;
  Close: typeof DialogClose;
}

/**
 * Tagged per-export, not on the file block: this module exports ten components
 * and a file-level @figma would hand all ten this one node.
 * @usage Interrupt the page with a modal that needs a decision or focused input before people continue.
 * @whenNot A preview on hover, a message that needs no reply, or content that can stay inline.
 * @useInstead Tooltip a short hint on hover or focus
 * @useInstead Alert a message that needs no reply
 * @useInstead ToastProvider a brief confirmation
 * @slot trigger The element that opens the dialog (Dialog.Trigger).
 * @slot overlay The scrim that dims the page behind the dialog (Dialog.Overlay).
 * @slot surface The modal surface (Dialog.Content).
 * @slot header Groups the title and description (Dialog.Header).
 * @slot title The heading that names the dialog (Dialog.Title).
 * @slot description Supporting text announced with the title (Dialog.Description).
 * @slot footer The row of actions (Dialog.Footer).
 * @slot close The button that closes the dialog (Dialog.Close, or the X built into Dialog.Content).
 * @keyboard Enter/Space Opens the dialog from the trigger and moves focus inside it.
 * @keyboard Escape Closes the dialog and returns focus to the trigger.
 * @keyboard Tab Cycles focus inside the open dialog.
 * @keyboard Shift+Tab Cycles focus backwards inside the open dialog.
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=93-27
 */
export const Dialog: DialogComponent = /* @__PURE__ */ Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Header: DialogHeader,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
  // Set here, not by a later `Dialog.displayName = …` write: a top-level
  // property write is a side effect that keeps the module alive.
  displayName: 'Dialog',
});

export {
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
