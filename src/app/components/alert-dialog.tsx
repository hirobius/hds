/**
 * AlertDialog — modal confirmation dialog on Radix AlertDialog.
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix AlertDialog (@radix-ui/react-alert-dialog) themed with the overlay role
 * tokens to match Dialog. Unlike Dialog it forces a decision: no
 * dismiss-on-outside-click, focus defaults to Cancel, and it exposes
 * Action/Cancel affordances for destructive or irreversible confirmations.
 *
 *   <AlertDialog>
 *     <AlertDialog.Trigger asChild><Button tone="danger">Delete</Button></AlertDialog.Trigger>
 *     <AlertDialog.Content>
 *       <AlertDialog.Header>
 *         <AlertDialog.Title>Delete project?</AlertDialog.Title>
 *         <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
 *       </AlertDialog.Header>
 *       <AlertDialog.Footer>
 *         <AlertDialog.Cancel asChild><Button variant="secondary">Cancel</Button></AlertDialog.Cancel>
 *         <AlertDialog.Action asChild><Button tone="danger">Delete</Button></AlertDialog.Action>
 *       </AlertDialog.Footer>
 *     </AlertDialog.Content>
 *   </AlertDialog>
 */
// motion-ok: Radix AlertDialog manages mount/unmount, focus trap, and scrim; parts are token styling passthroughs.

import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/utils';
import { Text } from './text';

// ── Root + leaf primitives ──────────────────────────────────────────────────────

const AlertDialogRoot = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;
const AlertDialogAction = AlertDialogPrimitive.Action;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;

// ── Overlay (scrim) ─────────────────────────────────────────────────────────────

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm', className)}
      {...props}
    />
  );
});

// ── Content ─────────────────────────────────────────────────────────────────────

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function AlertDialogContent({ className, ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-overlay hds-focus',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
});

// ── Layout parts ────────────────────────────────────────────────────────────────

const AlertDialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function AlertDialogHeader({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
    );
  },
);

const AlertDialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function AlertDialogFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2', className)}
        {...props}
      />
    );
  },
);

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className, children, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <Text ref={ref} as="h2" variant="heading3" className={className} {...props}>
        {children}
      </Text>
    </AlertDialogPrimitive.Title>
  );
});

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function AlertDialogDescription({ className, children, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Description asChild>
      <Text
        ref={ref}
        as="p"
        variant="caption"
        className={cn('text-muted-foreground', className)}
        {...props}
      >
        {children}
      </Text>
    </AlertDialogPrimitive.Description>
  );
});

// ── Compound assembly ────────────────────────────────────────────────────────────

interface AlertDialogComponent extends React.FC<
  React.ComponentProps<typeof AlertDialogPrimitive.Root>
> {
  Trigger: typeof AlertDialogTrigger;
  Portal: typeof AlertDialogPortal;
  Overlay: typeof AlertDialogOverlay;
  Content: typeof AlertDialogContent;
  Header: typeof AlertDialogHeader;
  Footer: typeof AlertDialogFooter;
  Title: typeof AlertDialogTitle;
  Description: typeof AlertDialogDescription;
  Action: typeof AlertDialogAction;
  Cancel: typeof AlertDialogCancel;
}

/**
 * AlertDialog root + parts. Controlled via `open`/`onOpenChange`, or
 * uncontrolled with `defaultOpen`.
 * @public
 */
export const AlertDialog = AlertDialogRoot as unknown as AlertDialogComponent;
AlertDialog.Trigger = AlertDialogTrigger;
AlertDialog.Portal = AlertDialogPortal;
AlertDialog.Overlay = AlertDialogOverlay;
AlertDialog.Content = AlertDialogContent;
AlertDialog.Header = AlertDialogHeader;
AlertDialog.Footer = AlertDialogFooter;
AlertDialog.Title = AlertDialogTitle;
AlertDialog.Description = AlertDialogDescription;
AlertDialog.Action = AlertDialogAction;
AlertDialog.Cancel = AlertDialogCancel;
