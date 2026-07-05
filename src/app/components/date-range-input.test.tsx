/**
 * Tests for DateRangeInput — trigger label (placeholder + formatted range)
 * and opening the popover to reveal the range calendar grid.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Built on Popover (Radix/Floating-UI) — polyfill the jsdom-missing APIs.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DateRangeInput } from './date-range-input';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(cleanup);

describe('DateRangeInput', () => {
  it('shows the placeholder when no value is selected', () => {
    render(<DateRangeInput placeholder="Select date range" />);
    expect(screen.getByRole('button').textContent).toContain('Select date range');
  });

  it('shows the formatted range on the trigger when a value is passed', () => {
    render(<DateRangeInput value={{ from: new Date('2026-07-01'), to: new Date('2026-07-10') }} />);
    expect(screen.getByRole('button').textContent).toContain('2026-07-01 – 2026-07-10');
  });

  it('opens the popover with a calendar grid when the trigger is clicked', () => {
    render(<DateRangeInput />);
    expect(screen.queryAllByRole('grid')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('grid').length).toBeGreaterThan(0);
  });
});
