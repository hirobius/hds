/**
 * Sheet — a bottom drawer on phones, the centred dialog from `sm` up (hds#690).
 * @category Overlays
 * @tier primitive
 */

/*
 * Built on the Radix Dialog primitive like `Dialog`, so it keeps that contract:
 * focus trap, scroll lock, Escape and scrim click close it, focus returns to the
 * trigger, the overlay portals into the nearest `data-hds` scope, and
 * `Sheet.Title` / `Sheet.Description` name and describe it.
 *
 *   <Sheet>
 *     <Sheet.Trigger asChild><Button variant="secondary">Sort</Button></Sheet.Trigger>
 *     <Sheet.Content>
 *       <Sheet.Header><Sheet.Title>Sort by</Sheet.Title></Sheet.Header>
 *       <Sheet.Actions>
 *         <Sheet.Action current onClick={…}>Newest</Sheet.Action>
 *         <Sheet.Action tone="danger" onClick={…}>Remove</Sheet.Action>
 *       </Sheet.Actions>
 *     </Sheet.Content>
 *   </Sheet>
 *
 * Below `sm` (640px) Sheet.Content docks to the bottom edge, full width, with a
 * grab handle and the bottom safe-area inset under its padding. It stays above
 * the on-screen keyboard: while open it mirrors `window.visualViewport` into two
 * local CSS variables. It slides up on the productive motion token, which
 * `prefers-reduced-motion` zeroes. From `sm` up it is the centred Dialog panel.
 * Layout lives in `.hds-sheet` (src/styles/theme.css).
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from './dialog';

// ── Keyboard awareness ────────────────────────────────────────────────────────

/** The local CSS variables Sheet.Content reads on phones (Shadow Token Convention). */
const SHEET_KEYBOARD_INSET_VAR = '--hds-local-sheet-inset-keyboard';
const SHEET_VISIBLE_HEIGHT_VAR = '--hds-local-sheet-height-visible';

/**
 * Mirrors the visual viewport (the part of the page the on-screen keyboard
 * leaves visible) onto the element: how far the keyboard reaches up from the
 * layout viewport's bottom, and the visible height. Without visualViewport
 * (old browsers, jsdom) nothing is set and the CSS fallbacks apply.
 */
function useVisualViewportInsets<T extends HTMLElement>(): React.RefCallback<T> {
  const [el, setEl] = React.useState<T | null>(null);

  React.useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!el || !vv) return;
    const apply = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      el.style.setProperty(SHEET_KEYBOARD_INSET_VAR, `${inset}px`);
      el.style.setProperty(SHEET_VISIBLE_HEIGHT_VAR, `${Math.round(vv.height)}px`);
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
    };
  }, [el]);

  return setEl;
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

// ── Content ────────────────────────────────────────────────────────────────────

/** @public */
export interface SheetContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  /** Hide the built-in close button. The scrim, Escape and Back still close the sheet. */
  hideClose?: boolean;
  /**
   * Element to portal into. Defaults to the nearest `data-hds` scope, so the
   * overlay inherits its theme; pass `null` to use `document.body`.
   */
  container?: HTMLElement | null;
}

const SheetContent = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(function SheetContent({ className, children, hideClose = false, container, ...props }, ref) {
  const insetsRef = useVisualViewportInsets<HTMLDivElement>();
  const merged = React.useMemo(() => mergeRefs(ref, insetsRef), [ref, insetsRef]);
  return (
    <DialogPortal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={merged}
        className={cn(
          // Position, size, padding and the entry slide: .hds-sheet (theme.css). Phone: docked,
          // top corners rounded, no bottom edge; sm up: the Dialog panel's radius and border.
          'hds-sheet z-50 grid gap-scale-sm rounded-t-lg border border-b-0 border-border bg-popover text-popover-foreground shadow-overlay hds-focus sm:max-w-lg sm:rounded-lg sm:border-b',
          className,
        )}
        {...props}
      >
        <div aria-hidden="true" className="hds-sheet-handle" />
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 inline-flex size-8 hds-touch-target items-center justify-center rounded-sm text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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

const SheetHeader = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function SheetHeader({ className, ...props }, ref) {
  // pr-scale-xl keeps a long title clear of the close button in the top-right padding.
  return (
    <div
      ref={ref}
      className={cn('flex flex-col gap-subgrid-gap pr-scale-xl text-left', className)}
      {...props}
    />
  );
});

const SheetFooter = /* @__PURE__ */ React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function SheetFooter({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col-reverse gap-scale-xs sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
});

// ── Actions (a list of choices) ───────────────────────────────────────────────

const SheetActions = /* @__PURE__ */ React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(function SheetActions({ className, ...props }, ref) {
  return <ul ref={ref} className={cn('flex flex-col', className)} {...props} />;
});

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- the hover fill is the semantic surface.sunken token, like Menu's highlight; it has no Tailwind-theme utility. Never the accent: an accent fill hid tertiary labels in dark mode (hds#690).
const sheetActionVariants = /* @__PURE__ */ cva(
  'flex w-full cursor-pointer select-none items-center gap-scale-xs rounded-sm px-scale-xs py-subgrid-gap text-left hds-type-ui hds-touch-row outline-none transition-colors hover:bg-[var(--semantic-color-surface-sunken)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      tone: {
        neutral: 'text-foreground',
        danger: 'text-feedback-danger hover:bg-feedback-bg-danger',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

/** @public */
export interface SheetActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Marks the current choice (sort order, status): a check and `aria-current="true"`. */
  current?: boolean;
  /** `danger` sets a destructive action in the danger colour. Default `neutral`. */
  tone?: 'neutral' | 'danger';
  /** Close the sheet after the click. Default true; `event.preventDefault()` in `onClick` keeps it open. */
  closeOnSelect?: boolean;
}

const SheetAction = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, SheetActionProps>(
  function SheetAction(
    { className, current = false, tone, closeOnSelect = true, children, type = 'button', ...props },
    ref,
  ) {
    const button = (
      <button
        ref={ref}
        type={type}
        aria-current={current ? 'true' : undefined}
        className={cn(sheetActionVariants({ tone }), className)}
        {...props}
      >
        <span className="min-w-0 flex-1">{children}</span>
        {current && <Check aria-hidden="true" className="size-4 shrink-0" />}
      </button>
    );
    return (
      <li className="list-none">
        {closeOnSelect ? <DialogPrimitive.Close asChild>{button}</DialogPrimitive.Close> : button}
      </li>
    );
  },
);

// ── Compound assembly ─────────────────────────────────────────────────────────

/** @public */
export interface SheetProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state for uncontrolled usage. */
  defaultOpen?: boolean;
  /** Children — typically `Sheet.Trigger` and `Sheet.Content`. */
  children?: React.ReactNode;
}

// Our own wrapper, not the Radix Root, so the compound parts are never written
// onto a third-party export (hds#363). A Sheet is always modal.
function SheetRoot(props: SheetProps) {
  return <DialogPrimitive.Root {...props} modal />;
}

interface SheetComponent extends React.FC<SheetProps> {
  /** Dialog's own parts: the trigger, close, title and description behave exactly as in Dialog. */
  Trigger: typeof DialogPrimitive.Trigger;
  Content: typeof SheetContent;
  Header: typeof SheetHeader;
  Footer: typeof SheetFooter;
  Title: typeof DialogTitle;
  Description: typeof DialogDescription;
  Actions: typeof SheetActions;
  Action: typeof SheetAction;
  Close: typeof DialogPrimitive.Close;
}

/**
 * @usage Open a short menu or form from the bottom edge on a phone (sort, row actions, status, a quick edit), centred like a Dialog on wider screens.
 * @whenNot A long or multi-step form, a confirmation of a destructive action, or a few actions on desktop only.
 * @useInstead Dialog long content or a desktop-first modal
 * @useInstead AlertDialog confirming a destructive or irreversible action
 * @useInstead Menu a desktop dropdown of actions
 * @slot trigger The element that opens the sheet (Sheet.Trigger).
 * @slot surface The sheet panel, with its grab handle on phones (Sheet.Content).
 * @slot header Groups the title and description (Sheet.Header).
 * @slot title The heading that names the sheet (Sheet.Title).
 * @slot description Supporting text announced with the title (Sheet.Description).
 * @slot actions A full-width list of choices (Sheet.Actions of Sheet.Action).
 * @slot footer The row of buttons (Sheet.Footer).
 * @slot close The button that closes the sheet (Sheet.Close, or the X built into Sheet.Content).
 * @keyboard Enter/Space Opens the sheet from the trigger and moves focus inside it.
 * @keyboard Escape Closes the sheet and returns focus to the trigger.
 * @keyboard Tab Cycles focus inside the open sheet.
 * @a11y component required a11y:sheet.open-keys Enter and Space on the trigger open the sheet.
 * @a11y component required a11y:sheet.escape-returns-focus Escape closes the sheet and returns focus to the trigger.
 * @a11y component required a11y:sheet.focus-trapped Tab and Shift+Tab stay inside the open sheet.
 * @a11y component required a11y:sheet.named-by-title The sheet is a dialog named by Sheet.Title.
 * @a11y component required a11y:sheet.action-current The current Sheet.Action carries aria-current="true".
 * @a11y component required gate:check-reduced-motion The entry slide reads the productive duration token, which prefers-reduced-motion zeroes.
 * @a11y consumer required Render a Sheet.Title in every Sheet.Content; it is the sheet's accessible name.
 * @a11y consumer required Render a Sheet.Description, or pass aria-describedby={undefined} on Sheet.Content when there is none.
 */
export const Sheet: SheetComponent = /* @__PURE__ */ Object.assign(SheetRoot, {
  Trigger: DialogPrimitive.Trigger,
  Content: SheetContent,
  Header: SheetHeader,
  Footer: SheetFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  Actions: SheetActions,
  Action: SheetAction,
  Close: DialogPrimitive.Close,
  displayName: 'Sheet',
});
