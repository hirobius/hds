/**
 * Toolbar — horizontal container that groups related controls (buttons,
 * toggles, separators) with a single roving tab-stop, built on Radix Toolbar.
 * @category Actions
 * @tier pattern
 * @public
 *
 *   <Toolbar aria-label="Formatting">
 *     <Toolbar.ToggleGroup type="single">
 *       <Toolbar.ToggleItem value="bold">Bold</Toolbar.ToggleItem>
 *     </Toolbar.ToggleGroup>
 *     <Toolbar.Separator />
 *     <Toolbar.Button>Share</Toolbar.Button>
 *   </Toolbar>
 */
// motion-ok: Radix Toolbar manages roving focus; parts are token styling passthroughs.

import * as React from 'react';
import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import { cn } from '../../lib/utils';

const ROOT = 'flex items-center gap-1 rounded-md border border-border bg-background p-1';
const BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-sm h-8 px-2 text-sm font-medium text-foreground hds-focus hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50';

// ── Button / Separator / ToggleGroup / ToggleItem / Link ────────────────────────

const ToolbarButton = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Button>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Button>
>(function ToolbarButton({ className, ...props }, ref) {
  return <ToolbarPrimitive.Button ref={ref} className={cn(BUTTON, className)} {...props} />;
});

const ToolbarSeparator = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Separator>
>(function ToolbarSeparator({ className, ...props }, ref) {
  return (
    <ToolbarPrimitive.Separator
      ref={ref}
      className={cn('mx-1 h-6 w-px bg-border', className)}
      {...props}
    />
  );
});

const ToolbarToggleGroup = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.ToggleGroup>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleGroup>
>(function ToolbarToggleGroup({ className, ...props }, ref) {
  return (
    <ToolbarPrimitive.ToggleGroup
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  );
});

const ToolbarToggleItem = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.ToggleItem>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleItem>
>(function ToolbarToggleItem({ className, ...props }, ref) {
  return (
    <ToolbarPrimitive.ToggleItem
      ref={ref}
      className={cn(
        BUTTON,
        'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
});

const ToolbarLink = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Link>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Link>
>(function ToolbarLink({ className, ...props }, ref) {
  return <ToolbarPrimitive.Link ref={ref} className={cn(BUTTON, className)} {...props} />;
});

// ── Compound export ──────────────────────────────────────────────────────────────

// A wrapper of our own, not the Radix Root itself: the compound below attaches
// the parts to it. Writing them onto a component at module scope is a side
// effect webpack and esbuild keep in every bundle that reaches the shared
// chunk (hds#363, hds#365).
function ToolbarRoot({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return <ToolbarPrimitive.Root className={cn(ROOT, className)} {...props} />;
}

export interface ToolbarComponent extends React.FC<
  React.ComponentProps<typeof ToolbarPrimitive.Root>
> {
  Button: typeof ToolbarButton;
  Separator: typeof ToolbarSeparator;
  ToggleGroup: typeof ToolbarToggleGroup;
  ToggleItem: typeof ToolbarToggleItem;
  Link: typeof ToolbarLink;
}

/**
 * Toolbar root. Groups related controls with a single roving tab-stop.
 * Supports the native `orientation` prop (`horizontal` | `vertical`).
 * @public
 */
export const Toolbar: ToolbarComponent = /* @__PURE__ */ Object.assign(ToolbarRoot, {
  Button: ToolbarButton,
  Separator: ToolbarSeparator,
  ToggleGroup: ToolbarToggleGroup,
  ToggleItem: ToolbarToggleItem,
  Link: ToolbarLink,
  // Set here, not by a later `Toolbar.displayName = …` write: a top-level
  // property write is a side effect that keeps the module alive.
  displayName: 'Toolbar',
});
