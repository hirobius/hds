/**
 * Tests for SelectableCard — checked-state rendering, click toggling, and the
 * disabled guard. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SelectableCard } from './selectable-card';

afterEach(cleanup);

describe('SelectableCard', () => {
  it('renders its children', () => {
    render(<SelectableCard>Plan A</SelectableCard>);
    expect(screen.getByText('Plan A')).not.toBeNull();
  });

  it('reflects aria-checked and data-state from the selected prop', () => {
    render(<SelectableCard selected>Plan A</SelectableCard>);
    const card = screen.getByRole('checkbox', { name: 'Plan A' });
    expect(card.getAttribute('aria-checked')).toBe('true');
    expect(card.getAttribute('data-state')).toBe('checked');
  });

  it('calls onSelectedChange with the toggled value on click', () => {
    let received: boolean | undefined;
    render(
      <SelectableCard selected={false} onSelectedChange={(v) => (received = v)}>
        Plan A
      </SelectableCard>,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Plan A' }));
    expect(received).toBe(true);
  });

  it('does not fire onSelectedChange when disabled', () => {
    let received: boolean | undefined;
    render(
      <SelectableCard selected={false} disabled onSelectedChange={(v) => (received = v)}>
        Plan A
      </SelectableCard>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan A' });
    expect(card.hasAttribute('disabled')).toBe(true);
    fireEvent.click(card);
    expect(received).toBe(undefined);
  });
});
