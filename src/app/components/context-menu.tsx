/**
 * ContextMenu — right-click context menu on Radix ContextMenu.
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix ContextMenu (@radix-ui/react-context-menu) themed with the same overlay
 * role tokens as Menu, so the dropdown and the right-click menu are visually
 * identical. Provides roving focus, type-ahead, checkbox/radio items, submenus,
 * cursor-anchored positioning, and portal mounting out of the box.
 *
 *   <ContextMenu>
 *     <ContextMenu.Trigger>Right-click me</ContextMenu.Trigger>
 *     <ContextMenu.Content>
 *       <ContextMenu.Item onSelect={…}>Cut</ContextMenu.Item>
 *       <ContextMenu.Separator />
 *       <ContextMenu.Item disabled>Paste</ContextMenu.Item>
 *     </ContextMenu.Content>
 *   </ContextMenu>
 */
// motion-ok: Radix ContextMenu manages open/close mounting + item highlight; parts are token styling passthroughs.

import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';

const ContextMenuRoot = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;
const ContextMenuSub = ContextMenuPrimitive.Sub;

// Shared skin — kept identical to menu.tsx so the two overlays read as one system.
const SURFACE =
  'z-50 min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay';
const ITEM =
  'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hds-focus data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

// ── Content ─────────────────────────────────────────────────────────────────────

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(function ContextMenuContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        collisionPadding={8}
        className={cn(SURFACE, className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
});

// ── Items ───────────────────────────────────────────────────────────────────────

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>
>(function ContextMenuItem({ className, ...props }, ref) {
  return <ContextMenuPrimitive.Item ref={ref} className={cn(ITEM, className)} {...props} />;
});

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(function ContextMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.CheckboxItem ref={ref} className={cn(ITEM, 'pl-6', className)} {...props}>
      <span className="absolute left-2 inline-flex items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Icon icon={Check} size={14} color="currentColor" aria-hidden />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
});

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(function ContextMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.RadioItem ref={ref} className={cn(ITEM, 'pl-6', className)} {...props}>
      <span className="absolute left-2 inline-flex items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Icon icon={Circle} size={6} color="currentColor" aria-hidden className="fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});

// ── Label / Separator / Submenu ──────────────────────────────────────────────────

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>
>(function ContextMenuLabel({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Label
      ref={ref}
      className={cn('px-2 py-1.5 text-sm font-medium text-muted-foreground', className)}
      {...props}
    />
  );
});

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(function ContextMenuSeparator({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
});

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>
>(function ContextMenuSubTrigger({ className, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(ITEM, 'data-[state=open]:bg-accent', className)}
      {...props}
    >
      {children}
      <Icon icon={ChevronRight} size={14} color="currentColor" aria-hidden className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  );
});

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(function ContextMenuSubContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent ref={ref} className={cn(SURFACE, className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
});

// ── Compound export ──────────────────────────────────────────────────────────────

interface ContextMenuComponent extends React.FC<
  React.ComponentProps<typeof ContextMenuPrimitive.Root>
> {
  Trigger: typeof ContextMenuTrigger;
  Content: typeof ContextMenuContent;
  Item: typeof ContextMenuItem;
  CheckboxItem: typeof ContextMenuCheckboxItem;
  RadioGroup: typeof ContextMenuRadioGroup;
  RadioItem: typeof ContextMenuRadioItem;
  Label: typeof ContextMenuLabel;
  Separator: typeof ContextMenuSeparator;
  Group: typeof ContextMenuGroup;
  Sub: typeof ContextMenuSub;
  SubTrigger: typeof ContextMenuSubTrigger;
  SubContent: typeof ContextMenuSubContent;
}

/**
 * ContextMenu root + parts. Wrap the right-clickable area in
 * `ContextMenu.Trigger`. Controlled via `onOpenChange`.
 * @public
 */
export const ContextMenu = ((props: React.ComponentProps<typeof ContextMenuPrimitive.Root>) => (
  <ContextMenuRoot {...props} />
)) as ContextMenuComponent;
ContextMenu.Trigger = ContextMenuTrigger;
ContextMenu.Content = ContextMenuContent;
ContextMenu.Item = ContextMenuItem;
ContextMenu.CheckboxItem = ContextMenuCheckboxItem;
ContextMenu.RadioGroup = ContextMenuRadioGroup;
ContextMenu.RadioItem = ContextMenuRadioItem;
ContextMenu.Label = ContextMenuLabel;
ContextMenu.Separator = ContextMenuSeparator;
ContextMenu.Group = ContextMenuGroup;
ContextMenu.Sub = ContextMenuSub;
ContextMenu.SubTrigger = ContextMenuSubTrigger;
ContextMenu.SubContent = ContextMenuSubContent;
