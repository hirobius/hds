/**
 * Tests for Menu — closed/open item mounting, onSelect wiring, disabled items.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Radix DropdownMenu positions via Floating UI, which calls APIs jsdom lacks
 * (ResizeObserver, hasPointerCapture, scrollIntoView) — polyfilled below.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Menu } from './menu';

beforeAll(() => {
  // @ts-expect-error — minimal jsdom polyfills for Radix/Floating-UI.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

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
  it('renders items with menu semantics when open', () => {
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
    expect(cls).toContain('data-[highlighted]:ring-2');
    expect(cls).toContain('data-[highlighted]:ring-inset');
    expect(cls.split(/\s+/)).not.toContain('hds-focus');
    expect(cls).toContain('data-[highlighted]:ring-ring');
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
});
