/**
 * Tests for HdsDateTimeInput — date text field, calendar popover, and the
 * paired native time field composing to one Date. Plain-DOM assertions (no
 * jest-dom matchers).
 *
 * Built on Popover (Radix) — polyfill the jsdom-missing APIs.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HdsDateTimeInput } from './hds-date-time-input';

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

describe('HdsDateTimeInput', () => {
  it('renders a date text input and a time input', () => {
    render(<HdsDateTimeInput aria-label="Appointment" />);
    const dateInput = screen.getByLabelText('Appointment') as HTMLInputElement;
    expect(dateInput.type).toBe('text');
    const timeInput = screen.getByLabelText('Appointment time') as HTMLInputElement;
    expect(timeInput.type).toBe('time');
  });

  it('shows the formatted date and time when value is set', () => {
    render(<HdsDateTimeInput value={new Date('2026-07-15T09:30')} aria-label="Appointment" />);
    const dateInput = screen.getByLabelText('Appointment') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-07-15');
    const timeInput = screen.getByLabelText('Appointment time') as HTMLInputElement;
    expect(timeInput.value).toBe('09:30');
  });

  it('opens the calendar popover from the trigger button', () => {
    render(<HdsDateTimeInput aria-label="Appointment" />);
    expect(screen.queryByRole('grid')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('grid')).not.toBeNull();
  });

  it('calls onChange with a combined Date when the time changes and a date is set', () => {
    const onChange = vi.fn();
    render(
      <HdsDateTimeInput
        value={new Date('2026-07-15T09:30')}
        onChange={onChange}
        aria-label="Appointment"
      />,
    );
    const timeInput = screen.getByLabelText('Appointment time') as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '14:45' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(arg instanceof Date).toBe(true);
    expect(arg.getHours()).toBe(14);
    expect(arg.getMinutes()).toBe(45);
  });

  it('calls onChange with a Date when a day is picked from the calendar', () => {
    const onChange = vi.fn();
    render(
      <HdsDateTimeInput
        value={new Date('2026-07-01T00:00')}
        onChange={onChange}
        aria-label="Appointment"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
    fireEvent.click(screen.getByText('15'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(arg instanceof Date).toBe(true);
  });
});
