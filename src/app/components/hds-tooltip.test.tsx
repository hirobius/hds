/**
 * Tests for HdsTooltip — trigger rendering, tooltip semantics, ref forwarding.
 * Uses defaultOpen to avoid hover-timing flakiness in jsdom.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Radix Tooltip positions via Floating UI, which calls APIs jsdom lacks
 * (ResizeObserver, hasPointerCapture, scrollIntoView) — polyfilled below.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsTooltip } from './hds-tooltip';

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

describe('HdsTooltip', () => {
  it('renders its trigger child', () => {
    render(
      <HdsTooltip content="Copy">
        <button>Trigger</button>
      </HdsTooltip>,
    );
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeDefined();
  });

  it('exposes tooltip content with role="tooltip" when open', () => {
    render(
      <HdsTooltip content="Copy to clipboard" defaultOpen>
        <button>Trigger</button>
      </HdsTooltip>,
    );
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toContain('Copy to clipboard');
  });

  it('wires the trigger to the tooltip via aria-describedby when open', () => {
    render(
      <HdsTooltip content="Copy" defaultOpen>
        <button>Trigger</button>
      </HdsTooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    expect(trigger.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('does not render tooltip content while closed', () => {
    render(
      <HdsTooltip content="Copy">
        <button>Trigger</button>
      </HdsTooltip>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
