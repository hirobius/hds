/**
 * Tests for Alert's type: the title is a heading set in the titleSm role, so it
 * takes the Sora heading face and weight with it, not a weight override on the
 * body face (hds#847).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Alert } from './alert';

afterEach(cleanup);

describe('Alert', () => {
  it('sets the title in the titleSm role (Sora heading face and weight)', () => {
    render(<Alert title="Published">Your changes are live.</Alert>);
    const title = screen.getByText('Published');
    expect(title.style.fontFamily).toBe('var(--semantic-typography-titleSm-font-family)');
    expect(title.style.fontWeight).toBe('var(--semantic-typography-titleSm-font-weight)');
    expect(title.style.fontSize).toBe('var(--semantic-typography-titleSm-font-size)');
  });

  it('keeps the message in the caption role', () => {
    render(<Alert title="Published">Your changes are live.</Alert>);
    const body = screen.getByText('Your changes are live.');
    expect(body.style.fontFamily).toBe('var(--semantic-typography-caption-font-family)');
    expect(body.style.fontWeight).toBe('var(--semantic-typography-caption-font-weight)');
  });

  it('defaults to the existing padding (size md) and offers a compact sm', () => {
    const { container, rerender } = render(<Alert>Msg</Alert>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-size')).toBe('md');
    expect(root.className).toContain('p-[var(--semantic-space-surface-padding)]');
    rerender(<Alert size="sm">Msg</Alert>);
    const sm = container.firstElementChild as HTMLElement;
    expect(sm.getAttribute('data-size')).toBe('sm');
    expect(sm.className).toContain('p-[var(--semantic-space-scale-xs)]');
    expect(sm.className).not.toContain('p-[var(--semantic-space-surface-padding)]');
  });

  it('separates title and message with a flex gap and explicit zero margins, so a host reset cannot collapse or inflate it (hds#863)', () => {
    render(<Alert title="Published">Your changes are live.</Alert>);
    const stack = screen.getByText('Published').parentElement as HTMLElement;
    expect(stack.className).toMatch(/(^|\s)flex(\s|$)/);
    expect(stack.className).toContain('flex-col');
    expect(stack.className).toContain('gap-[var(--semantic-space-subgrid-hairline)]');
    expect(screen.getByText('Published').style.margin).toBe('0px');
    expect(screen.getByText('Your changes are live.').style.margin).toBe('0px');
  });
});
