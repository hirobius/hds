/**
 * Tests for Menu — closed/open item mounting, onSelect wiring, disabled items.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Radix DropdownMenu positions via Floating UI, which calls APIs jsdom lacks
 * (ResizeObserver, hasPointerCapture, scrollIntoView); tests/setup/jsdom-polyfills.ts
 * stubs them for every suite.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Menu } from './menu';

afterEach(cleanup);

function Example({ onSelect }: { onSelect?: () => void } = {}) {
  return (
    <Menu defaultOpen>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Account</Menu.Label>
        <Menu.Item onSelect={onSelect}>Profile</Menu.Item>
        <Menu.Separator />
        <Menu.Item disabled>Sign out</Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

describe('Menu', () => {
  it('a11y:menu.item-semantics - renders items with menu semantics when open', () => {
    render(<Example />);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).not.toBeNull();
    expect(screen.getByText('Account')).not.toBeNull();
  });

  it('marks disabled items as disabled', () => {
    render(<Example />);
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' });
    expect(signOut.getAttribute('data-disabled')).not.toBeNull();
  });

  it('fires onSelect when an item is chosen', () => {
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
    expect(onSelect).toHaveBeenCalled();
  });

  it('does not render content while closed', () => {
    render(
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Profile</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    expect(screen.queryByRole('menuitem')).toBeNull();
  });
});

describe('Menu highlighted row ring', () => {
  it('draws a 2px inset ring on the highlighted item', () => {
    render(<Example />);
    const cls = screen.getByRole('menuitem', { name: 'Profile' }).className;
    // .hds-focus-inset[data-highlighted]: the shared ring, inside the row edge.
    expect(cls.split(/\s+/)).toContain('hds-focus-inset');
    expect(cls.split(/\s+/)).not.toContain('hds-focus');
  });
});

describe('Menu compound assembly (hds#365)', () => {
  const PARTS = [
    'Trigger',
    'Content',
    'Item',
    'CheckboxItem',
    'RadioGroup',
    'RadioItem',
    'Label',
    'Separator',
    'Group',
    'Sub',
    'SubTrigger',
    'SubContent',
  ] as const;

  it('does not write the parts onto the Radix Root export', () => {
    expect(Menu).not.toBe(MenuPrimitive.Root);
    const root = MenuPrimitive.Root as unknown as Record<string, unknown>;
    for (const part of PARTS) expect(root[part], `Radix Root.${part}`).toBeUndefined();
  });

  it('keeps every static part and the display name', () => {
    expect(Menu.displayName).toBe('Menu');
    for (const part of PARTS) expect(Menu[part], part).toBeDefined();
    expect(Menu.Trigger).toBe(MenuPrimitive.Trigger);
    expect(Menu.Group).toBe(MenuPrimitive.Group);
    expect(Menu.RadioGroup).toBe(MenuPrimitive.RadioGroup);
    expect(Menu.Sub).toBe(MenuPrimitive.Sub);
  });

  it('still forwards root props to Radix (controlled open)', () => {
    render(
      <Menu open>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Profile</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    expect(screen.getByRole('menu')).not.toBeNull();
    // The open modal menu hides the rest of the page from the a11y tree.
    const trigger = screen.getByRole('button', { name: 'Actions', hidden: true });
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('caps content height to the available space and scrolls (hds#821)', () => {
    render(<Example />);
    const menu = screen.getByRole('menu');
    expect(menu.className).toContain('max-h-[var(--radix-dropdown-menu-content-available-height)]');
    expect(menu.className).toContain('overflow-y-auto');
    expect(menu.className).not.toContain('overflow-hidden');
  });

  it('tone="danger" colours the item with the danger content colour (hds#822)', () => {
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Rename</Menu.Item>
          <Menu.Item tone="danger">Remove</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    const remove = screen.getByRole('menuitem', { name: 'Remove' });
    expect(remove.className).toContain('text-feedback-danger');
    expect(remove.className).toContain('data-[highlighted]:text-feedback-danger');
    expect(remove.className).not.toContain(
      'data-[highlighted]:text-[var(--semantic-color-content-primary)]',
    );
    expect(remove.className).toContain('data-[highlighted]:bg-feedback-bg-danger');
    expect(remove.getAttribute('data-tone')).toBe('danger');
  });

  it('keeps the neutral item unchanged by default', () => {
    render(<Example />);
    const profile = screen.getByRole('menuitem', { name: 'Profile' });
    expect(profile.className).not.toContain('feedback-danger');
    expect(profile.className).toContain(
      'data-[highlighted]:text-[var(--semantic-color-content-primary)]',
    );
    expect(profile.getAttribute('data-tone')).toBe('neutral');
  });
});

describe('Menu rows with a switch and a description (hds#1440)', () => {
  function Rows({ onCheckedChange }: { onCheckedChange?: (v: boolean) => void }) {
    return (
      <Menu defaultOpen>
        <Menu.Trigger>Settings</Menu.Trigger>
        <Menu.Content>
          <Menu.CheckboxItem
            indicator="switch"
            checked
            onCheckedChange={onCheckedChange}
            description="Use the dark colour scheme"
          >
            Dark theme
          </Menu.CheckboxItem>
          <Menu.CheckboxItem indicator="switch" checked={false}>
            Pause animations
          </Menu.CheckboxItem>
          <Menu.Item description="Opens your profile">Profile</Menu.Item>
        </Menu.Content>
      </Menu>
    );
  }

  it('a11y:menu.switch-row - a switch row is a menuitemcheckbox that reports aria-checked', () => {
    render(<Rows />);
    const on = screen.getByRole('menuitemcheckbox', { name: 'Dark theme' });
    const off = screen.getByRole('menuitemcheckbox', { name: 'Pause animations' });
    expect(on.getAttribute('aria-checked')).toBe('true');
    expect(off.getAttribute('aria-checked')).toBe('false');
  });

  it('draws a hidden, non-focusable switch indicator from the Toggle tokens', () => {
    render(<Rows />);
    const row = screen.getByRole('menuitemcheckbox', { name: 'Dark theme' });
    const sw = row.querySelector('[data-slot="menu-switch"]') as HTMLElement;
    expect(sw.getAttribute('aria-hidden')).toBe('true');
    expect(sw.querySelector('[tabindex],input,button')).toBeNull();
    expect(sw.getAttribute('data-state')).toBe('checked');
    expect(sw.className).toContain('--semantic-size-control-md');
    expect(sw.className).toContain('--semantic-color-surface-accent');
    const off = screen.getByRole('menuitemcheckbox', { name: 'Pause animations' });
    expect(off.querySelector('[data-slot="menu-switch"]')?.getAttribute('data-state')).toBe(
      'unchecked',
    );
  });

  it('toggles without closing the menu', () => {
    const onCheckedChange = vi.fn();
    render(<Rows onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Dark theme' }));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Dark theme' })).not.toBeNull();
  });

  it('a11y:menu.row-description - renders the description in the caption role and wires aria-describedby', () => {
    render(<Rows />);
    const row = screen.getByRole('menuitemcheckbox', { name: 'Dark theme' });
    const desc = row.querySelector('[data-slot="menu-description"]') as HTMLElement;
    expect(desc.textContent).toBe('Use the dark colour scheme');
    expect(desc.className).toContain('hds-type-caption');
    expect(row.getAttribute('aria-describedby')).toBe(desc.id);
    const item = screen.getByRole('menuitem', { name: 'Profile' });
    const d2 = item.querySelector('[data-slot="menu-description"]') as HTMLElement;
    expect(item.getAttribute('aria-describedby')).toBe(d2.id);
  });

  it('rows lift to the 44px touch row on a phone and keep desktop density otherwise', () => {
    render(<Rows />);
    const row = screen.getByRole('menuitemcheckbox', { name: 'Dark theme' });
    // hds-touch-row sets min-height: semantic.size.touchTarget (44px) under pointer:coarse or <640px.
    expect(row.className).toContain('hds-touch-row');
    expect(row.className).toContain('py-1.5');
    expect(row.className).toContain('hds-type-ui');
  });
});
