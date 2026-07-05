/**
 * HdsAlertDialog — modal confirmation dialog on Radix AlertDialog.
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix AlertDialog (@radix-ui/react-alert-dialog) themed with the overlay role
 * tokens to match Dialog. Unlike Dialog it forces a decision: no
 * dismiss-on-outside-click, focus defaults to Cancel, and it exposes
 * Action/Cancel affordances for destructive or irreversible confirmations.
 *
 *   <HdsAlertDialog>
 *     <HdsAlertDialog.Trigger asChild><Button tone="danger">Delete</Button></HdsAlertDialog.Trigger>
 *     <HdsAlertDialog.Content>
 *       <HdsAlertDialog.Header>
 *         <HdsAlertDialog.Title>Delete project?</HdsAlertDialog.Title>
 *         <HdsAlertDialog.Description>This cannot be undone.</HdsAlertDialog.Description>
 *       </HdsAlertDialog.Header>
 *       <HdsAlertDialog.Footer>
 *         <HdsAlertDialog.Cancel asChild><Button variant="secondary">Cancel</Button></HdsAlertDialog.Cancel>
 *         <HdsAlertDialog.Action asChild><Button tone="danger">Delete</Button></HdsAlertDialog.Action>
 *       </HdsAlertDialog.Footer>
 *     </HdsAlertDialog.Content>
 *   </HdsAlertDialog>
 */
// motion-ok: Radix AlertDialog manages mount/unmount, focus trap, and scrim; parts are token styling passthroughs.

import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '../../lib/utils';
import { Text } from './text';

// ── Root + leaf primitives ──────────────────────────────────────────────────────

const HdsAlertDialogRoot = AlertDialogPrimitive.Root;
const HdsAlertDialogTrigger = AlertDialogPrimitive.Trigger;
const HdsAlertDialogPortal = AlertDialogPrimitive.Portal;
const HdsAlertDialogAction = AlertDialogPrimitive.Action;
const HdsAlertDialogCancel = AlertDialogPrimitive.Cancel;

// ── Overlay (scrim) ─────────────────────────────────────────────────────────────

const HdsAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function HdsAlertDialogOverlay({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm', className)}
      {...props}
    />
  );
});

// ── Content ─────────────────────────────────────────────────────────────────────

const HdsAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(function HdsAlertDialogContent({ className, ...props }, ref) {
  return (
    <HdsAlertDialogPortal>
      <HdsAlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-overlay hds-focus',
          className,
        )}
        {...props}
      />
    </HdsAlertDialogPortal>
  );
});

// ── Layout parts ────────────────────────────────────────────────────────────────

const HdsAlertDialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function HdsAlertDialogHeader({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
    );
  },
);

const HdsAlertDialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function HdsAlertDialogFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2', className)}
        {...props}
      />
    );
  },
);

const HdsAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function HdsAlertDialogTitle({ className, children, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <Text ref={ref} as="h2" variant="heading3" className={className} {...props}>
        {children}
      </Text>
    </AlertDialogPrimitive.Title>
  );
});

const HdsAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(function HdsAlertDialogDescription({ className, children, ...props }, ref) {
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

interface HdsAlertDialogComponent extends React.FC<
  React.ComponentProps<typeof AlertDialogPrimitive.Root>
> {
  Trigger: typeof HdsAlertDialogTrigger;
  Portal: typeof HdsAlertDialogPortal;
  Overlay: typeof HdsAlertDialogOverlay;
  Content: typeof HdsAlertDialogContent;
  Header: typeof HdsAlertDialogHeader;
  Footer: typeof HdsAlertDialogFooter;
  Title: typeof HdsAlertDialogTitle;
  Description: typeof HdsAlertDialogDescription;
  Action: typeof HdsAlertDialogAction;
  Cancel: typeof HdsAlertDialogCancel;
}

/**
 * AlertDialog root + parts. Controlled via `open`/`onOpenChange`, or
 * uncontrolled with `defaultOpen`.
 * @public
 */
export const HdsAlertDialog = HdsAlertDialogRoot as unknown as HdsAlertDialogComponent;
HdsAlertDialog.Trigger = HdsAlertDialogTrigger;
HdsAlertDialog.Portal = HdsAlertDialogPortal;
HdsAlertDialog.Overlay = HdsAlertDialogOverlay;
HdsAlertDialog.Content = HdsAlertDialogContent;
HdsAlertDialog.Header = HdsAlertDialogHeader;
HdsAlertDialog.Footer = HdsAlertDialogFooter;
HdsAlertDialog.Title = HdsAlertDialogTitle;
HdsAlertDialog.Description = HdsAlertDialogDescription;
HdsAlertDialog.Action = HdsAlertDialogAction;
HdsAlertDialog.Cancel = HdsAlertDialogCancel;
