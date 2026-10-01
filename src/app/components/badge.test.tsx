/**
 * Badge `dot` (hds#393), the survivor for the standalone status dot. A dot is a solid
 * feedback-colored circle with no text; a `label` makes it a named status,
 * otherwise it is decorative and a sibling carries the meaning.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Badge } from './badge';

afterEach(cleanup);

describe('Badge dot (hds#393)', () => {
  it('<Badge dot label="Online"/> is a status named "Online"', () => {
    render(<Badge dot label="Online" />);
    const dot = screen.getByRole('status', { name: 'Online' });
    expect(dot.getAttribute('aria-label')).toBe('Online');
    expect(dot.hasAttribute('aria-hidden')).toBe(false);
  });

  it('<Badge dot/> without a label is aria-hidden and not a status', () => {
    const { container } = render(<Badge dot />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(dot.hasAttribute('role')).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders no text, even when children are passed', () => {
    const { container } = render(
      <Badge dot tone="success" label="Online">
        Online
      </Badge>,
    );
    expect(container.textContent).toBe('');
  });

  it('keeps tone as the color axis and exposes the dot size', () => {
    const { container } = render(<Badge dot tone="danger" size="lg" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.getAttribute('data-tone')).toBe('danger');
    expect(dot.getAttribute('data-size')).toBe('lg');
  });

  it('leaves a text badge as it was: no role, no aria-hidden', () => {
    render(<Badge tone="info">Beta</Badge>);
    const badge = screen.getByText('Beta');
    expect(badge.hasAttribute('role')).toBe(false);
    expect(badge.hasAttribute('aria-hidden')).toBe(false);
    expect(badge.hasAttribute('data-size')).toBe(false);
  });
});
