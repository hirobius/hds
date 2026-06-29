/**
 * Menu — dropdown menu (shadcn baseline, compound parts).
 * @category Overlays
 * @tier primitive
 * @doc-exempt: no Overlays doc page yet — add demo when the overlays page is created
 *
 * Radix DropdownMenu (@radix-ui/react-dropdown-menu) themed with the overlay
 * role tokens to match Dialog/Popover. Provides roving focus, type-ahead,
 * keyboard nav, checkbox/radio items, submenus, outside-click + ESC dismissal,
 * and portal mounting out of the box.
 *
 *   <Menu>
 *     <Menu.Trigger asChild><Button>Actions</Button></Menu.Trigger>
 *     <Menu.Content>
 *       <Menu.Label>Account</Menu.Label>
 *       <Menu.Item onSelect={…}>Profile</Menu.Item>
 *       <Menu.Separator />
 *       <Menu.Item disabled>Sign out</Menu.Item>
 *     </Menu.Content>
 *   </Menu>
 */
// motion-ok: Radix DropdownMenu manages open/close mounting + item highlight;
// triggers/items are styling passthroughs over the primitive's a11y contract.

import * as React from 'react';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';

const MenuRoot = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;
const MenuGroup = MenuPrimitive.Group;
const MenuRadioGroup = MenuPrimitive.RadioGroup;
const MenuSub = MenuPrimitive.Sub;

const SURFACE =
  'z-50 min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay';
const ITEM =
  'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hds-focus data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

// ── Content ────────────────────────────────────────────────────────────────────

const MenuContent = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Content>
>(function MenuContent({ className, sideOffset = 4, ...props }, ref) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(SURFACE, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
});

// ── Item ───────────────────────────────────────────────────────────────────────

const MenuItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item>
>(function MenuItem({ className, ...props }, ref) {
  return <MenuPrimitive.Item ref={ref} className={cn(ITEM, className)} {...props} />;
});

const MenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>
>(function MenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.CheckboxItem ref={ref} className={cn(ITEM, 'pl-6', className)} {...props}>
      <span className="absolute left-2 inline-flex items-center justify-center">
        <MenuPrimitive.ItemIndicator>
          <Icon icon={Check} size={14} color="currentColor" aria-hidden />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
});

const MenuRadioItem = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>
>(function MenuRadioItem({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.RadioItem ref={ref} className={cn(ITEM, 'pl-6', className)} {...props}>
      <span className="absolute left-2 inline-flex items-center justify-center">
        <MenuPrimitive.ItemIndicator>
          <Icon icon={Circle} size={6} color="currentColor" aria-hidden className="fill-current" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
});

// ── Label / Separator / Submenu ─────────────────────────────────────────────────

const MenuLabel = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Label>
>(function MenuLabel({ className, ...props }, ref) {
  return (
    <MenuPrimitive.Label
      ref={ref}
      className={cn('px-2 py-1.5 text-sm font-medium text-muted-foreground', className)}
      {...props}
    />
  );
});

const MenuSeparator = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(function MenuSeparator({ className, ...props }, ref) {
  return (
    <MenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
});

const MenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubTrigger>
>(function MenuSubTrigger({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.SubTrigger
      ref={ref}
      className={cn(ITEM, 'data-[state=open]:bg-accent', className)}
      {...props}
    >
      {children}
      <Icon icon={ChevronRight} size={14} color="currentColor" aria-hidden className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  );
});

const MenuSubContent = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubContent>
>(function MenuSubContent({ className, ...props }, ref) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent ref={ref} className={cn(SURFACE, className)} {...props} />
    </MenuPrimitive.Portal>
  );
});

// ── Compound export ────────────────────────────────────────────────────────────

interface MenuComponent extends React.FC<React.ComponentProps<typeof MenuPrimitive.Root>> {
  Trigger: typeof MenuTrigger;
  Content: typeof MenuContent;
  Item: typeof MenuItem;
  CheckboxItem: typeof MenuCheckboxItem;
  RadioGroup: typeof MenuRadioGroup;
  RadioItem: typeof MenuRadioItem;
  Label: typeof MenuLabel;
  Separator: typeof MenuSeparator;
  Group: typeof MenuGroup;
  Sub: typeof MenuSub;
  SubTrigger: typeof MenuSubTrigger;
  SubContent: typeof MenuSubContent;
}

/**
 * Menu root + parts. Controlled via `open`/`onOpenChange`, or uncontrolled with
 * `defaultOpen`.
 * @public
 */
const Menu = ((props: React.ComponentProps<typeof MenuPrimitive.Root>) => (
  <MenuRoot {...props} />
)) as MenuComponent;
Menu.Trigger = MenuTrigger;
Menu.Content = MenuContent;
Menu.Item = MenuItem;
Menu.CheckboxItem = MenuCheckboxItem;
Menu.RadioGroup = MenuRadioGroup;
Menu.RadioItem = MenuRadioItem;
Menu.Label = MenuLabel;
Menu.Separator = MenuSeparator;
Menu.Group = MenuGroup;
Menu.Sub = MenuSub;
Menu.SubTrigger = MenuSubTrigger;
Menu.SubContent = MenuSubContent;

export { Menu };
