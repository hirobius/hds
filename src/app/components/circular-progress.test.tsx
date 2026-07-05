import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CircularProgress } from './circular-progress';

afterEach(cleanup);

describe('CircularProgress', () => {
  it('exposes a determinate progressbar with value/min/max', () => {
    render(<CircularProgress value={40} label="Uploading" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-label')).toBe('Uploading');
  });

  it('clamps the value into the 0..max range', () => {
    render(<CircularProgress value={200} max={100} label="p" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('omits aria-valuenow when indeterminate', () => {
    render(<CircularProgress indeterminate label="Loading" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  });

  it('renders two SVG circles (track + indicator)', () => {
    const { container } = render(<CircularProgress value={50} label="p" />);
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });
});
