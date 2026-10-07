import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { __resetDeprecationWarnings } from '../../lib/deprecation';
import { StatusDot } from './status-dot';

afterEach(cleanup);

describe('StatusDot', () => {
  // The deprecation notice below is covered on its own; keep it out of these.
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('defaults to the neutral tone', () => {
    const { container } = render(<StatusDot />);
    expect(container.firstElementChild?.getAttribute('data-tone')).toBe('neutral');
  });

  it('reflects an explicit tone', () => {
    const { container } = render(<StatusDot tone="success" />);
    expect(container.firstElementChild?.getAttribute('data-tone')).toBe('success');
  });

  it('exposes a labelled image role when label is provided (not a live region, hds#522)', () => {
    render(<StatusDot tone="danger" label="Offline" />);
    const el = screen.getByRole('img');
    expect(el.getAttribute('aria-label')).toBe('Offline');
  });

  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(<StatusDot tone="info" />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});

// hds#395 (B5), ADR-014 step 1: StatusDot is deprecated for Badge dot and goes
// in 0.21.0. It stays in 0.20.0 because ops passes it `style`, which Badge
// does not take, so no codemod can rewrite that site.
describe('StatusDot is deprecated for Badge dot (hds#395)', () => {
  beforeEach(() => __resetDeprecationWarnings());
  afterEach(() => vi.restoreAllMocks());

  it('warns once per session in development, naming Badge dot and 0.21.0', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<StatusDot tone="success" />);
    render(<StatusDot label="Online" />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(
      /^\[HDS deprecation\] StatusDot is deprecated and is removed in 0\.21\.0\. Use <Badge dot>/,
    );
  });

  it('still renders the same dot while it warns', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<StatusDot tone="warning" size="lg" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.className).toContain('bg-feedback-warning');
    expect(dot.className).toContain('h-2.5');
  });
});
