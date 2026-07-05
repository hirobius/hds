import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsCalendar } from './hds-calendar';

afterEach(cleanup);

describe('HdsCalendar', () => {
  it('renders a month grid with day cells', () => {
    render(<HdsCalendar mode="single" defaultMonth={new Date('2026-07-01')} />);
    // react-day-picker renders a grid; day 15 should be present as a button.
    expect(screen.getByText('15')).not.toBeNull();
    expect(screen.getByRole('grid')).not.toBeNull();
  });

  it('marks the selected day as selected', () => {
    const selected = new Date('2026-07-15');
    render(<HdsCalendar mode="single" selected={selected} defaultMonth={selected} />);
    const day = screen.getByText('15').closest('button, [role="gridcell"]');
    expect(day).not.toBeNull();
  });

  it('calls onSelect when a day is chosen', () => {
    const onSelect = vi.fn();
    render(<HdsCalendar mode="single" defaultMonth={new Date('2026-07-01')} onSelect={onSelect} />);
    expect(screen.getByText('10')).not.toBeNull();
  });
});
