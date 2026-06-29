/**
 * Tests for Spinner — status semantics, default + custom label, size mapping.
 * Plain-DOM assertions (the repo does not load jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Spinner } from './spinner';

afterEach(cleanup);

describe('Spinner', () => {
  it('exposes role=status with a default accessible label', () => {
    render(<Spinner />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe('Loading');
    expect(el.getAttribute('data-size')).toBe('md');
  });

  it('honors a custom label and size', () => {
    render(<Spinner label="Fetching jobs" size="lg" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe('Fetching jobs');
    expect(el.getAttribute('data-size')).toBe('lg');
  });

  it('merges a caller className', () => {
    render(<Spinner className="mt-4" />);
    expect(screen.getByRole('status').classList.contains('mt-4')).toBe(true);
  });
});
