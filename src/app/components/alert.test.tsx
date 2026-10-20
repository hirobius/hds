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
});
