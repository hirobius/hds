/**
 * AlertDialog — modal confirmation dialog on Radix AlertDialog.
 * @category Overlays
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components-Copy?node-id=2035-24
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
import { withHdsPortal } from '../context/hds-portal';
import { Text } from './text';

// ── Root + leaf primitives ──────────────────────────────────────────────────────

// A wrapper of our own, not the Radix Root itself: the compound below attaches
// the parts to it. Attaching them to `AlertDialogPrimitive.Root` compiled to
// property writes on a third-party export, which webpack and esbuild keep in
// every bundle that reaches the shared chunk (hds#363).
function AlertDialogRoot(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root {...props} />;
}
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = /* @__PURE__ */ withHdsPortal(AlertDialogPrimitive.Portal);
const AlertDialogAction = AlertDialogPrimitive.Action;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;

// ── Overlay (scrim) ─────────────────────────────────────────────────────────────

const AlertDialogOverlay = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(function AlertDialogOverlay({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-scrim/60 backdrop-blur-sm', className)}
      {...props}
    />
  );
});

// ── Content ─────────────────────────────────────────────────────────────────────

/** @public */
export interface AlertDialogContentProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Content
> {
  /**
   * Element to portal into. Defaults to the nearest `data-hds` scope, so the
   * overlay inherits its theme; pass `null` to use `document.body`.
   */
  container?: HTMLElement | null;
}

const AlertDialogContent = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(function AlertDialogContent({ className, container, ...props }, ref) {
  return (
    <AlertDialogPortal container={container}>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          // 16px of page margin each side, so the panel never sits flush to a 390px viewport (hds#522)
          'fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2*var(--semantic-space-scale-sm))] max-h-[calc(100dvh-2*var(--semantic-space-scale-sm))] max-w-lg overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-overlay hds-focus',
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
});

// ── Layout parts ────────────────────────────────────────────────────────────────

const AlertDialogHeader = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AlertDialogHeader({ className, ...props }, ref) {
  return (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
  );
});

const AlertDialogFooter = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AlertDialogFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  );
});

const AlertDialogTitle = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(function AlertDialogTitle({ className, children, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title asChild>
      <Text ref={ref} as="h2" variant="title" className={className} {...props}>
        {children}
      </Text>
    </AlertDialogPrimitive.Title>
  );
});

const AlertDialogDescription = /* @__PURE__ */ React.forwardRef<
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
 * @usage Confirm a destructive or irreversible action (delete, archive, remove) before it runs, with Cancel and Action buttons.
 * @whenNot A modal that collects input or shows content, or a confirmation after the action is done.
 * @useInstead Dialog a modal with a form or other content
 * @useInstead ToastProvider a brief confirmation after the action
 * @public
 */
export const AlertDialog: AlertDialogComponent = /* @__PURE__ */ Object.assign(AlertDialogRoot, {
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Header: AlertDialogHeader,
  Footer: AlertDialogFooter,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
  // Set here, not by a later `AlertDialog.displayName = …` write: a top-level
  // property write is a side effect that keeps the module alive.
  displayName: 'AlertDialog',
});
