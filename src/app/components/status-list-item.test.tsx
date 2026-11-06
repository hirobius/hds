import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatusListItem } from './status-list-item';

afterEach(cleanup);

describe('StatusListItem', () => {
  it('a11y:status-list-item.status-named - speaks statusLabel with the title, since the dot is hidden', () => {
    const { container } = render(
      <StatusListItem tone="warning" statusLabel="Overdue" title="Quote awaiting reply" />,
    );
    const title = screen.getByText('Quote awaiting reply', { exact: false });
    expect(title.textContent).toBe('Quote awaiting reply, Overdue');
    // The status text is for screen readers only; the dot stays the visual cue.
    expect(screen.getByText(', Overdue').className).toContain('sr-only');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('adds no status text without statusLabel', () => {
    render(<StatusListItem tone="success" title="Invoice sent" />);
    expect(screen.getByText('Invoice sent').textContent).toBe('Invoice sent');
  });

  it('keeps notes and the trailing slot', () => {
    render(
      <StatusListItem title="Invoice sent" notes={['Paid on delivery']} trailing={<b>Paid</b>} />,
    );
    expect(screen.getByText('Paid on delivery')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
  });
});
