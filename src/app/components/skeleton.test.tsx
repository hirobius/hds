/**
 * Tests for Skeleton — decorative semantics, variant mapping, dimension props.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Skeleton } from './skeleton';

afterEach(cleanup);

describe('Skeleton', () => {
  it('is decorative (aria-hidden) and carries the shimmer class', () => {
    const { container } = render(<Skeleton width={120} height={16} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.classList.contains('hds-skeleton')).toBe(true);
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('16px');
  });

  it('defaults text variant height to 1em', () => {
    const { container } = render(<Skeleton variant="text" width={200} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('data-variant')).toBe('text');
    expect(el.style.height).toBe('1em');
  });

  it('records the requested variant', () => {
    const { container } = render(<Skeleton variant="circular" width={40} height={40} />);
    expect((container.firstElementChild as HTMLElement).getAttribute('data-variant')).toBe(
      'circular',
    );
  });
});
