/**
 * Tests for Menu — closed/open item mounting, onSelect wiring, disabled items.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Radix DropdownMenu positions via Floating UI, which calls APIs jsdom lacks
 * (ResizeObserver, hasPointerCapture, scrollIntoView) — polyfilled below.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
