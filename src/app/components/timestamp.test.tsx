import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Timestamp } from './timestamp';

afterEach(cleanup);

const REF = new Date('2026-07-04T12:00:00.000Z');

describe('Timestamp', () => {
  it('renders a <time> element with a machine-readable dateTime', () => {
    const { container } = render(<Timestamp date={REF} format="date" locale="en-US" />);
    const el = container.querySelector('time');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('dateTime')).toBe(REF.toISOString());
  });

  it('formats an absolute date deterministically for a fixed locale', () => {
    render(<Timestamp date={REF} format="date" locale="en-US" />);
    // en-US medium date style → "Jul 4, 2026"
    expect(screen.getByText('Jul 4, 2026')).not.toBeNull();
  });

  it('formats a relative time against an explicit `now`', () => {
    const now = new Date('2026-07-04T14:00:00.000Z');
    render(<Timestamp date={REF} format="relative" locale="en-US" now={now} />);
    expect(screen.getByText('2 hours ago')).not.toBeNull();
  });

  it('accepts an ISO string input', () => {
    const { container } = render(
      <Timestamp date={REF.toISOString()} format="time" locale="en-US" />,
    );
    expect(container.querySelector('time')?.getAttribute('dateTime')).toBe(REF.toISOString());
  });
});
