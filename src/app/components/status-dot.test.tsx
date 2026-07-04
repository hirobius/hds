import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatusDot } from './status-dot';

afterEach(cleanup);

describe('StatusDot', () => {
  it('defaults to the neutral tone', () => {
    const { container } = render(<StatusDot />);
    expect(container.firstElementChild?.getAttribute('data-tone')).toBe('neutral');
  });

  it('reflects an explicit tone', () => {
    const { container } = render(<StatusDot tone="success" />);
    expect(container.firstElementChild?.getAttribute('data-tone')).toBe('success');
  });

  it('exposes a labelled status role when label is provided', () => {
    render(<StatusDot tone="danger" label="Offline" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe('Offline');
  });

  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(<StatusDot tone="info" />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
