/**
 * Badge has no `dot` (hds#759, Adrian 2026-10-16): status is shown as text,
 * never a coloured circle. The dot-only props (`dot`, `size`, `label`) are gone,
 * so a stray one reaches the DOM as nothing more than an unknown attribute.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Badge, type BadgeProps } from './badge';

afterEach(cleanup);

describe('Badge has no status dot (hds#759)', () => {
  it('always renders its children as a text chip', () => {
    const props = { dot: true, tone: 'success' } as unknown as BadgeProps;
    render(<Badge {...props}>Online</Badge>);
    const badge = screen.getByText('Online');
    expect(badge.className).not.toContain('rounded-full');
    expect(badge.className).not.toContain('bg-feedback-success');
    expect(badge.hasAttribute('aria-hidden')).toBe(false);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('leaves a text badge as it was: no role, no aria-hidden, no size', () => {
    render(<Badge tone="info">Beta</Badge>);
    const badge = screen.getByText('Beta');
    expect(badge.getAttribute('data-tone')).toBe('info');
    expect(badge.hasAttribute('role')).toBe(false);
    expect(badge.hasAttribute('aria-hidden')).toBe(false);
    expect(badge.hasAttribute('data-size')).toBe(false);
  });
});
