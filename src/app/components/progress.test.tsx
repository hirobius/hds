/**
 * Tests for Progress — progressbar semantics, determinate aria-value*, clamping,
 * and indeterminate state. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Progress } from './progress';

afterEach(cleanup);

describe('Progress', () => {
  it('reports determinate value via aria-valuenow', () => {
    render(<Progress value={42} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('data-state')).toBe('determinate');
  });

  it('clamps out-of-range values', () => {
    render(<Progress value={140} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    cleanup();
    render(<Progress value={-20} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('omits aria-valuenow when indeterminate', () => {
    render(<Progress value={null} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.getAttribute('data-state')).toBe('indeterminate');
  });
});
