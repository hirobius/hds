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
 * Surface uses role.popover (semantic.color.surface.floating) + a
 * border.default hairline + shadow-overlay (semantic.shadow.overlay from 8e-1). The scrim is
 * role.scrim (semantic.color.surface.scrim) at 60% alpha: dark in both
 * themes, black in dark mode. The overlay portals into the nearest
 * `data-hds` scope so it inherits the active theme; pass `container` to
 * override. The close affordance is rendered as an absolutely-positioned
 * X inside Content; pass `hideClose` to opt out for fully-custom layouts.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';
import { withHdsPortal } from '../context/hds-portal';
import { Text } from './text';
import { OverlayClose } from './overlay-close';

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

type DialogSize = 'sm' | 'md' | 'lg' | 'xl';
type DialogPlacement = 'center' | 'top';

// `md` is the long-standing max-w-lg, so a Dialog with no `size` is unchanged.
const DIALOG_SIZE: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const VIEWPORT_HEIGHT_VAR = '--hds-dialog-viewport-height';

/**
 * Tracks the visual viewport height (it shrinks when the on-screen keyboard
 * opens, where `100dvh` does not on iOS) and publishes it as a CSS variable
 * on the dialog surface. No-op without `window.visualViewport`.
 */
function useVisualViewportHeight(enabled: boolean) {
  const [height, setHeight] = React.useState<number | null>(null);
  React.useEffect(() => {
    const vv = typeof window === 'undefined' ? undefined : window.visualViewport;
    if (!enabled || !vv) return;
    const update = () => setHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [enabled]);
  return height;
}

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
  /** Maximum width of the panel. `md` (default) is the long-standing width. */
  size?: DialogSize;
  /**
   * Where the panel sits. `center` (default) is vertically centred; `top`
   * anchors it under the top safe area and caps its height to the visual
   * viewport, so a form with an on-screen keyboard stays visible.
   */
  placement?: DialogPlacement;
  /**
   * Pin `Dialog.Header` and `Dialog.Footer` and scroll only `Dialog.Body`.
   * Off (default), the whole panel scrolls.
   */
  scrollBody?: boolean;
}

const DialogContent = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  {
    className,
    children,
    hideClose = false,
    container,
    size = 'md',
    placement = 'center',
    scrollBody = false,
    style,
    ...props
  },
  ref,
) {
  const top = placement === 'top';
  const viewportHeight = useVisualViewportHeight(top);
  const heightStyle =
    top && viewportHeight !== null
      ? ({ [VIEWPORT_HEIGHT_VAR]: `${viewportHeight}px` } as React.CSSProperties)
      : undefined;
  return (
    <DialogPortal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-size={size}
        data-placement={placement}
        style={heightStyle ? { ...heightStyle, ...style } : style}
        className={cn(
          // 16px of page margin each side, so the panel never sits flush to a 390px viewport (hds#522)
          'fixed left-1/2 z-50 w-[calc(100%-2*var(--semantic-space-scale-sm))] -translate-x-1/2 gap-scale-sm rounded-lg border border-border bg-popover p-surface-padding text-popover-foreground shadow-overlay hds-focus',
          DIALOG_SIZE[size],
          // Whole-panel scroll (default) or a clipped column where only Dialog.Body scrolls.
          scrollBody ? 'flex flex-col overflow-hidden' : 'grid overflow-y-auto',
          top
            ? 'top-[max(var(--semantic-space-scale-sm),env(safe-area-inset-top))] max-h-[calc(var(--hds-dialog-viewport-height,100dvh)-2*var(--semantic-space-scale-sm))]'
            : 'top-1/2 -translate-y-1/2 max-h-[calc(100dvh-2*var(--semantic-space-scale-sm))]',
          // The close button sits in the top-right padding (up to 60px in at 390, where it is a 44px
          // target); the first child, the Title or Header, keeps 40px clear so a long title never runs
          // under the X.
          !hideClose && '[&>:first-child]:pr-10',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <OverlayClose
            placement="absolute right-4 top-4 inline-flex size-8 hds-touch-target"
            className="disabled:pointer-events-none"
          />
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
    // Flex gap, not `space-y-*`: a host reset (`* { margin: 0 }`) zeroes sibling margins, never gap (hds#863).
    <div
      ref={ref}
      className={cn('flex shrink-0 flex-col gap-px6 text-left', className)}
      {...props}
    />
  );
});

const DialogFooter = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DialogFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex shrink-0 flex-col-reverse gap-scale-xs sm:flex-row sm:justify-end sm:gap-scale-xs',
        className,
      )}
      {...props}
    />
  );
});

/** Scrolling region between a pinned Header and Footer; needs `scrollBody` on Content. */
const DialogBody = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DialogBody({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
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
  Body: typeof DialogBody;
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
 * @useInstead AlertDialog confirming a destructive or irreversible action
 * @slot trigger The element that opens the dialog (Dialog.Trigger).
 * @slot overlay The scrim that dims the page behind the dialog (Dialog.Overlay).
 * @slot surface The modal surface (Dialog.Content).
 * @slot header Groups the title and description (Dialog.Header).
 * @slot title The heading that names the dialog (Dialog.Title).
 * @slot description Supporting text announced with the title (Dialog.Description).
 * @slot body The scrolling region between a pinned header and footer (Dialog.Body, with scrollBody on Dialog.Content).
 * @slot footer The row of actions (Dialog.Footer).
 * @slot close The button that closes the dialog (Dialog.Close, or the X built into Dialog.Content).
 * @keyboard Enter/Space Opens the dialog from the trigger and moves focus inside it.
 * @keyboard Escape Closes the dialog and returns focus to the trigger.
 * @keyboard Tab Cycles focus inside the open dialog.
 * @keyboard Shift+Tab Cycles focus backwards inside the open dialog.
 * @a11y component required a11y:dialog.open-keys Enter and Space on the trigger open the dialog.
 * @a11y component required a11y:dialog.trigger-haspopup The trigger announces a dialog popup (aria-haspopup).
 * @a11y component required a11y:dialog.trigger-expanded The trigger exposes aria-expanded, false while closed and true while open.
 * @a11y component required a11y:dialog.trigger-controls The trigger points aria-controls at the open dialog.
 * @a11y component required a11y:dialog.initial-focus Focus moves inside the dialog when it opens.
 * @a11y component required a11y:dialog.focus-trapped Tab and Shift+Tab stay inside the open modal dialog.
 * @a11y component required a11y:dialog.escape-returns-focus Escape closes the dialog and returns focus to the trigger.
 * @a11y component required a11y:dialog.named-by-title The dialog is named by Dialog.Title and described by Dialog.Description.
 * @a11y component required a11y:dialog.close-named The built-in close button is named "Close".
 * @a11y consumer required Render a Dialog.Title in every Dialog.Content; it is the dialog's accessible name.
 * @a11y consumer required Render a Dialog.Description, or pass aria-describedby={undefined} on Dialog.Content when there is none.
 * @a11y consumer required Give an icon-only Dialog.Trigger or custom Dialog.Close an aria-label.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=93-27
 */
export const Dialog: DialogComponent = /* @__PURE__ */ Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
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
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
