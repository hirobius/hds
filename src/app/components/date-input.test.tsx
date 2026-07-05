/**
 * Tests for DateInput — formatted value display, opening the calendar
 * popover, and selecting a day. Plain-DOM assertions (no jest-dom matchers).
 *
 * Built on Popover (Radix) — polyfill the jsdom-missing APIs.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DateInput } from './date-input';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  // @ts-expect-error — minimal jsdom polyfills for Radix Popover.
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!window.matchMedia) {
    // @ts-expect-error — partial matchMedia stub.
    window.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }
});

afterEach(cleanup);

describe('DateInput', () => {
  it('shows the formatted value in the input when value is set', () => {
    render(<DateInput value={new Date('2026-07-15')} aria-label="Date" />);
    const input = screen.getByLabelText('Date') as HTMLInputElement;
    expect(input.value).toBe('2026-07-15');
  });

  it('opens the calendar popover from the trigger button', () => {
    render(<DateInput aria-label="Date" />);
    expect(screen.queryByRole('grid')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('grid')).not.toBeNull();
  });

  it('calls onChange with a Date when a day is selected', () => {
    const onChange = vi.fn();
    render(<DateInput value={new Date('2026-07-01')} onChange={onChange} aria-label="Date" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
    fireEvent.click(screen.getByText('15'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(arg instanceof Date).toBe(true);
  });
});
