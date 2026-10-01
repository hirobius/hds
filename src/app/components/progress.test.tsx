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

  it('fills the bar to exactly the value on the default scale', () => {
    // Values that float math (value / 100 * 100) turns into 7.000000000000001:
    // the default scale renders the value as given, as it did before max.
    for (const [value, width] of [
      [7, '7%'],
      [29, '29%'],
      [57, '57%'],
      [33.3, '33.3%'],
    ] as const) {
      const { container } = render(<Progress value={value} />);
      const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;
      expect(fill.getAttribute('style')).toBe(`width: ${width};`);
      cleanup();
    }
  });

  it('omits aria-valuenow when indeterminate', () => {
    render(<Progress value={null} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.getAttribute('data-state')).toBe('indeterminate');
  });
});

// ── hds#393: variant="circular", tone, max ──────────────────────────────────

describe('Progress max (hds#393)', () => {
  it('reports the value against max and fills the same share of the bar', () => {
    const { container } = render(<Progress value={6} max={12} label="Steps" />);
    const bar = screen.getByRole('progressbar', { name: 'Steps' });
    expect(bar.getAttribute('aria-valuenow')).toBe('6');
    expect(bar.getAttribute('aria-valuemax')).toBe('12');
    const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('clamps to max', () => {
    render(<Progress value={20} max={12} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('12');
  });
});

describe('Progress variant="circular" (hds#393)', () => {
  it('is a determinate progressbar drawn as a ring', () => {
    const { container } = render(
      <Progress variant="circular" value={5} max={12} label="Uploading" />,
    );
    const ring = screen.getByRole('progressbar', { name: 'Uploading' });
    expect(ring.getAttribute('aria-valuemin')).toBe('0');
    expect(ring.getAttribute('aria-valuemax')).toBe('12');
    expect(ring.getAttribute('aria-valuenow')).toBe('5');
    expect(ring.getAttribute('data-variant')).toBe('circular');
    expect(container.querySelectorAll('svg circle')).toHaveLength(2);
  });

  it('is a span, so the ring can sit inline in a paragraph', () => {
    render(
      <p>
        Saving <Progress variant="circular" size="sm" label="Saving" />
      </p>,
    );
    expect(screen.getByRole('progressbar', { name: 'Saving' }).tagName).toBe('SPAN');
  });

  it('is indeterminate without a value', () => {
    render(<Progress variant="circular" label="Loading" />);
    const ring = screen.getByRole('progressbar', { name: 'Loading' });
    expect(ring.getAttribute('aria-valuenow')).toBeNull();
    expect(ring.getAttribute('data-state')).toBe('indeterminate');
  });

  it('takes tone and size', () => {
    const { container } = render(
      <Progress variant="circular" tone="danger" size="lg" value={3} max={12} />,
    );
    const ring = screen.getByRole('progressbar');
    expect(ring.getAttribute('data-tone')).toBe('danger');
    // lg is the 32px ring.
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('32');
  });

  it('defaults to the linear bar', () => {
    render(<Progress value={40} />);
    expect(screen.getByRole('progressbar').getAttribute('data-variant')).toBe('linear');
  });
});

describe('Progress tone (hds#393)', () => {
  it('marks the linear bar with its tone, neutral by default', () => {
    render(<Progress value={40} tone="success" />);
    expect(screen.getByRole('progressbar').getAttribute('data-tone')).toBe('success');
    cleanup();
    render(<Progress value={40} />);
    expect(screen.getByRole('progressbar').getAttribute('data-tone')).toBe('neutral');
  });
});
