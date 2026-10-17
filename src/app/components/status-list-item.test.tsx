/**
 * StatusListItem has no leading dot (hds#759): the title, notes and a text Badge
 * in `trailing` carry the status, so the row has no `tone` and paints no circle.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Badge } from './badge';
import { StatusListItem } from './status-list-item';

afterEach(cleanup);

describe('StatusListItem (hds#759)', () => {
  it('renders title, notes and trailing with no dot and no tone', () => {
    const { container } = render(
      <StatusListItem
        title="Invoice sent"
        notes={['Due Friday']}
        trailing={<Badge tone="success">Paid</Badge>}
      />,
    );
    expect(screen.getByText('Invoice sent')).toBeTruthy();
    expect(screen.getByText('Due Friday')).toBeTruthy();
    expect(screen.getByText('Paid')).toBeTruthy();
    const row = container.firstElementChild as HTMLElement;
    expect(row.hasAttribute('data-tone')).toBe(false);
    expect(container.querySelector('.rounded-full, [aria-hidden="true"]')).toBeNull();
  });
});
