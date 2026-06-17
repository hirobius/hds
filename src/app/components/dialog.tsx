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
 * a foreground/80 wash so it picks up the theme without a hardcoded
 * black. The close affordance is rendered as an absolutely-positioned
 * X inside Content; pass `hideClose` to opt out for fully-custom layouts.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Root + leaf primitives (re-exported from Radix) ────────────────────────────

const DialogRoot = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// ── Overlay (scrim) ────────────────────────────────────────────────────────────

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm', className)}
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
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent({ className, children, hideClose = false, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-overlay hds-focus',
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

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function DialogHeader({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
    );
  },
);

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function DialogFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2', className)}
        {...props}
      />
    );
  },
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
});

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
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

export const Dialog = DialogRoot as unknown as DialogComponent;
Dialog.Trigger = DialogTrigger;
Dialog.Portal = DialogPortal;
Dialog.Overlay = DialogOverlay;
Dialog.Content = DialogContent;
Dialog.Header = DialogHeader;
Dialog.Footer = DialogFooter;
Dialog.Title = DialogTitle;
Dialog.Description = DialogDescription;
Dialog.Close = DialogClose;

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
