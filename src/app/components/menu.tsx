/**
 * Menu — dropdown menu (shadcn baseline, compound parts).
 * @category Overlays
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=93-59
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

import * as React from 'react';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { withHdsPortal } from '../context/hds-portal';
import { Icon } from './icon';
import { toggleTrackVariants, toggleThumbVariants } from './toggle-switch-styles';

// A wrapper of our own, not the Radix Root itself: the compound below attaches
// the parts to it. Writing them onto a component at module scope is a side
// effect webpack and esbuild keep in every bundle that reaches the shared
// chunk (hds#363, hds#365).
function MenuRoot(props: React.ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root {...props} />;
}
const MenuTrigger = MenuPrimitive.Trigger;
const MenuGroup = MenuPrimitive.Group;
const MenuRadioGroup = MenuPrimitive.RadioGroup;
const MenuSub = MenuPrimitive.Sub;
const MenuPortal = /* @__PURE__ */ withHdsPortal(MenuPrimitive.Portal);

const SURFACE =
  'z-50 min-w-32 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-md border border-border bg-popover p-fixed-2xs text-popover-foreground shadow-overlay';
// Max-height + overflow-y-auto (hds#821): Radix scroll-locks the page while a
// menu is open and the 44px coarse-pointer rows make a long menu taller than a
// phone, so the surface caps itself to the room Radix measured and scrolls.
// Tone is the only styling axis (hds#822). Only neutral and danger change the
// item today; the rest of the fixed vocabulary is accepted and renders neutral,
// so a caller can pass any tone without a type error.
const NEUTRAL_TONE = 'data-[highlighted]:text-[var(--semantic-color-content-primary)]';
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- the highlight fill is the semantic surface.sunken token (dark-surface-contrast.test.ts); it has no Tailwind-theme utility, and var() keeps it token-driven.
const menuItemVariants = /* @__PURE__ */ cva(
  'relative flex cursor-pointer select-none items-center gap-scale-xs rounded-sm px-scale-xs py-1.5 hds-type-ui hds-touch-row outline-none data-[highlighted]:bg-[var(--semantic-color-surface-sunken)] hds-focus-inset data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  {
    variants: {
      tone: {
        neutral: NEUTRAL_TONE,
        danger:
          'text-feedback-danger data-[highlighted]:bg-feedback-bg-danger data-[highlighted]:text-feedback-danger',
        success: NEUTRAL_TONE,
        warning: NEUTRAL_TONE,
        info: NEUTRAL_TONE,
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);
const ITEM = menuItemVariants();

// ── Description + switch (hds#1440) ────────────────────────────────────────────
// A row's optional caption sits under its label and is the row's accessible
// description (aria-describedby), as List rows do: the name stays the label alone,
// so the caption is aria-hidden (a hidden node can still describe).
const DESCRIPTION = 'hds-type-caption block text-[var(--semantic-color-content-secondary)]';

/** Label plus optional caption, stacked. Returns the content and the id to describe the row by. */
function useRowBody(children: React.ReactNode, description: React.ReactNode) {
  const descId = React.useId();
  const hasDescription = description != null && description !== false;
  const body = hasDescription ? (
    <span className="flex min-w-0 flex-col">
      <span>{children}</span>
      <span id={descId} aria-hidden="true" data-slot="menu-description" className={DESCRIPTION}>
        {description}
      </span>
    </span>
  ) : (
    children
  );
  return { body, describedBy: hasDescription ? descId : undefined };
}

/**
 * Switch indicator for a checkbox row. Purely visual (aria-hidden, no focusable
 * child): the row itself is the menuitemcheckbox. Geometry and colours are the
 * Toggle's tokens; the thumb's travel equals semantic.size.control.md (track is
 * twice that wide, thumb fills the padded rail), so no literal is needed.
 */
function MenuSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-slot="menu-switch"
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn('ml-auto', toggleTrackVariants({ on: checked, disabled: false }))}
    >
      <span
        className={cn(
          toggleThumbVariants({ on: checked, disabled: false }),
          'transition-transform',
        )}
        style={checked ? { transform: 'translateX(var(--semantic-size-control-md))' } : undefined}
      />
    </span>
  );
}

// ── Content ────────────────────────────────────────────────────────────────────

const MenuContent = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Content> & {
    /**
     * Element to portal into. Defaults to the nearest `data-hds` scope, so the
     * overlay inherits its theme; pass `null` to use `document.body`.
     */
    container?: HTMLElement | null;
  }
>(function MenuContent({ className, sideOffset = 4, container, ...props }, ref) {
  return (
    <MenuPortal container={container}>
      <MenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(SURFACE, className)}
        {...props}
      />
    </MenuPortal>
  );
});

// ── Item ───────────────────────────────────────────────────────────────────────

const MenuItem = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> &
    VariantProps<typeof menuItemVariants> & {
      /** Optional caption under the label, in the caption type role; the row's accessible description. */
      description?: React.ReactNode;
    }
>(function MenuItem({ className, tone, description, children, ...props }, ref) {
  const { body, describedBy } = useRowBody(children, description);
  return (
    <MenuPrimitive.Item
      ref={ref}
      data-tone={tone ?? 'neutral'}
      aria-describedby={describedBy}
      className={cn(menuItemVariants({ tone }), className)}
      {...props}
    >
      {body}
    </MenuPrimitive.Item>
  );
});

const MenuCheckboxItem = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem> & {
    /** `check` (default) puts a tick in the leading gutter; `switch` draws a trailing switch for settings like "Dark theme". */
    indicator?: 'check' | 'switch';
    /** Optional caption under the label, in the caption type role; the row's accessible description. */
    description?: React.ReactNode;
  }
>(function MenuCheckboxItem(
  { className, children, indicator = 'check', description, checked, onSelect, ...props },
  ref,
) {
  const { body, describedBy } = useRowBody(children, description);
  const isSwitch = indicator === 'switch';
  return (
    <MenuPrimitive.CheckboxItem
      ref={ref}
      checked={checked}
      aria-describedby={describedBy}
      data-indicator={indicator}
      // A switch is a setting, not an action: flipping it keeps the menu open so
      // several can be set in one visit. The caller's onSelect can still close it.
      onSelect={(event) => {
        if (isSwitch) event.preventDefault();
        onSelect?.(event);
      }}
      className={cn(ITEM, !isSwitch && 'pl-fixed-md', className)}
      {...props}
    >
      {isSwitch ? (
        <>
          {body}
          <MenuSwitch checked={checked === true} />
        </>
      ) : (
        <>
          <span className="absolute left-2 inline-flex items-center justify-center">
            <MenuPrimitive.ItemIndicator>
              <Icon icon={Check} size={14} color="currentColor" aria-hidden />
            </MenuPrimitive.ItemIndicator>
          </span>
          {body}
        </>
      )}
    </MenuPrimitive.CheckboxItem>
  );
});

const MenuRadioItem = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>
>(function MenuRadioItem({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.RadioItem ref={ref} className={cn(ITEM, 'pl-fixed-md', className)} {...props}>
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

const MenuLabel = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Label>
>(function MenuLabel({ className, ...props }, ref) {
  return (
    <MenuPrimitive.Label
      ref={ref}
      className={cn('px-scale-xs py-1.5 hds-type-ui text-muted-foreground', className)}
      {...props}
    />
  );
});

const MenuSeparator = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(function MenuSeparator({ className, ...props }, ref) {
  return (
    <MenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-fixed-2xs my-fixed-2xs h-px bg-border', className)}
      {...props}
    />
  );
});

const MenuSubTrigger = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubTrigger>
>(function MenuSubTrigger({ className, children, ...props }, ref) {
  return (
    <MenuPrimitive.SubTrigger
      ref={ref}
      className={cn(ITEM, 'data-[state=open]:bg-[var(--semantic-color-surface-sunken)]', className)}
      {...props}
    >
      {children}
      <Icon icon={ChevronRight} size={14} color="currentColor" aria-hidden className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  );
});

const MenuSubContent = /* @__PURE__ */ React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubContent> & {
    /**
     * Element to portal into. Defaults to the nearest `data-hds` scope, so the
     * overlay inherits its theme; pass `null` to use `document.body`.
     */
    container?: HTMLElement | null;
  }
>(function MenuSubContent({ className, container, ...props }, ref) {
  return (
    <MenuPortal container={container}>
      <MenuPrimitive.SubContent ref={ref} className={cn(SURFACE, className)} {...props} />
    </MenuPortal>
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
 * `defaultOpen`. A setting that flips on or off is a Menu.CheckboxItem with
 * `indicator="switch"`: it shows a trailing switch and keeps the menu open when
 * toggled (a tick row still closes it). `description` on an Item or CheckboxItem
 * adds a caption line under the label.
 * @usage Offer a list of actions from a trigger, closed until opened.
 * @whenNot Choosing one value for a form field, or a set of options that must stay visible.
 * @useInstead Select choosing a value for a form field
 * @slot trigger The element that opens the menu (Menu.Trigger).
 * @slot content The popup holding the items (Menu.Content).
 * @keyboard Enter/Space/ArrowDown Opens the menu from the trigger and highlights the first item.
 * @keyboard ArrowDown/ArrowUp Moves the highlight; it stops at the first and last item.
 * @keyboard Home/End Jumps to the first or last item.
 * @keyboard Character Highlights the next item that starts with the typed letter.
 * @keyboard Enter Selects the highlighted item and closes the menu.
 * @keyboard Escape Closes the menu and returns focus to the trigger.
 * @keyboard Tab Does not leave the open menu.
 * @a11y component required a11y:menu.open-keys Enter, Space and ArrowDown on the trigger open the menu.
 * @a11y component required a11y:menu.trigger-haspopup The trigger announces a menu popup (aria-haspopup=menu).
 * @a11y component required a11y:menu.trigger-expanded The trigger exposes aria-expanded, false while closed and true while open.
 * @a11y component required a11y:menu.trigger-controls The trigger points aria-controls at the open menu.
 * @a11y component required a11y:menu.escape-returns-focus Escape closes the menu and returns focus to the trigger.
 * @a11y component required a11y:menu.tab-contained Tab does not move focus out of the open menu.
 * @a11y component required a11y:menu.arrow-keys ArrowDown and ArrowUp move the highlight and stop at the first and last item.
 * @a11y component required a11y:menu.home-end Home and End jump to the first and last item.
 * @a11y component required a11y:menu.typeahead Typing a letter highlights the next item that starts with it.
 * @a11y component required a11y:menu.enter-selects Enter selects the highlighted item and closes the menu.
 * @a11y component required a11y:menu.space-activates Space selects the highlighted item and closes the menu.
 * @a11y component required a11y:menu.named-by-trigger The menu is named by its trigger.
 * @a11y component required a11y:menu.item-position Each item is a menuitem that reports its position and set size.
 * @a11y component required a11y:menu.item-semantics Items render with menuitem semantics once open.
 * @a11y component required a11y:menu.disabled-skipped A disabled item is aria-disabled and arrow keys step over it.
 * @a11y component required a11y:menu.switch-row A switch row is a menuitemcheckbox with aria-checked; its switch is a decorative aria-hidden indicator, never focusable.
 * @a11y component required a11y:menu.row-description A row's description is its accessible description (aria-describedby); the name stays the label alone.
 * @a11y consumer required Give an icon-only Menu.Trigger an aria-label.
 * @a11y consumer required Use Menu for actions; use links or Select for navigation and value choice.
 * @public
 */
const Menu: MenuComponent = /* @__PURE__ */ Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Label: MenuLabel,
  Separator: MenuSeparator,
  Group: MenuGroup,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
  // Set here, not by a later `Menu.displayName = …` write: a top-level
  // property write is a side effect that keeps the module alive.
  displayName: 'Menu',
});

export { Menu };
