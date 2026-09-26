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

const ToolbarButton = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Button>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Button>
>(function ToolbarButton({ className, ...props }, ref) {
  return <ToolbarPrimitive.Button ref={ref} className={cn(BUTTON, className)} {...props} />;
});

const ToolbarSeparator = React.forwardRef<
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

const ToolbarToggleGroup = React.forwardRef<
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

const ToolbarToggleItem = React.forwardRef<
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

const ToolbarLink = React.forwardRef<
  React.ElementRef<typeof ToolbarPrimitive.Link>,
  React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Link>
>(function ToolbarLink({ className, ...props }, ref) {
  return <ToolbarPrimitive.Link ref={ref} className={cn(BUTTON, className)} {...props} />;
});

// ── Compound export ──────────────────────────────────────────────────────────────

interface ToolbarComponent extends React.FC<React.ComponentProps<typeof ToolbarPrimitive.Root>> {
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
export const Toolbar = (({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Root>) => (
  <ToolbarPrimitive.Root className={cn(ROOT, className)} {...props} />
)) as ToolbarComponent;
Toolbar.Button = ToolbarButton;
Toolbar.Separator = ToolbarSeparator;
Toolbar.ToggleGroup = ToolbarToggleGroup;
Toolbar.ToggleItem = ToolbarToggleItem;
Toolbar.Link = ToolbarLink;
