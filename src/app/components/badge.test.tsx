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
  it('<Badge dot label="Online"/> is an image named "Online" (not a live region, hds#522)', () => {
    render(<Badge dot label="Online" />);
    const dot = screen.getByRole('img', { name: 'Online' });
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

describe('Badge count (hds#865)', () => {
  it('renders the number', () => {
    render(<Badge count={12} />);
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('caps at max and shows "<max>+"', () => {
    render(<Badge count={120} max={99} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('shows the exact number at or below max', () => {
    render(<Badge count={99} max={99} />);
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('has no cap without max', () => {
    render(<Badge count={1204} />);
    expect(screen.getByText('1204')).toBeTruthy();
  });

  it('renders 0', () => {
    render(<Badge count={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('is neutral by default and uses tabular numbers', () => {
    const { container } = render(<Badge count={3} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.getAttribute('data-tone')).toBe('neutral');
    expect(badge.className).toContain('tabular-nums');
  });

  it('label names the badge, even when the number is capped', () => {
    render(<Badge count={120} max={99} label="120 roles" />);
    const badge = screen.getByRole('img', { name: '120 roles' });
    expect(badge.textContent).toBe('99+');
  });

  it('without a label the number is plain text, not an image', () => {
    render(<Badge count={12} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('ignores children when count is set', () => {
    const { container } = render(<Badge count={5}>Ignored</Badge>);
    expect(container.textContent).toBe('5');
  });

  it('a text badge keeps children and no tabular-nums', () => {
    const { container } = render(<Badge>Draft</Badge>);
    expect(container.textContent).toBe('Draft');
    expect((container.firstElementChild as HTMLElement).className).not.toContain('tabular-nums');
  });
});
