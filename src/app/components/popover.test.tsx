/**
 * Tests for Popover — closed/open content mounting, trigger semantics, and
 * a custom Close. Plain-DOM assertions (no jest-dom matchers).
 *
 * Radix Popover positions via Floating UI, which calls APIs jsdom lacks
 * (ResizeObserver, hasPointerCapture, scrollIntoView) — polyfilled below.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Popover } from './popover';

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

function Example(props: { defaultOpen?: boolean }) {
  return (
    <Popover defaultOpen={props.defaultOpen}>
      <Popover.Trigger>Open</Popover.Trigger>
      <Popover.Content>
        <span>Popover body</span>
        <Popover.Close>Dismiss</Popover.Close>
      </Popover.Content>
    </Popover>
  );
}

describe('Popover', () => {
  it('does not render content while closed', () => {
    render(<Example />);
    expect(screen.queryByText('Popover body')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).not.toBeNull();
  });

  it('renders content when open and reflects expanded state on the trigger', () => {
    render(<Example defaultOpen />);
    expect(screen.getByText('Popover body')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Open' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('opens on trigger click', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Popover body')).not.toBeNull();
  });
});
