/**
 * Tests for Button — the gold-standard reference test for HDS primitives.
 * Covers: rendering, variant/tone/size data hooks, disabled + loading states,
 * click gating, asChild polymorphism, iconOnly a11y, and ref forwarding.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
  it('renders its children as an accessible button', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).tagName).toBe('BUTTON');
  });

  it('reflects variant/tone/size on data-* hooks', () => {
    render(
      <Button variant="primary" tone="danger" size="lg">
        Delete
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.getAttribute('data-variant')).toBe('primary');
    expect(btn.getAttribute('data-tone')).toBe('danger');
    expect(btn.getAttribute('data-size')).toBe('lg');
  });

  it('disables the underlying button when disabled', () => {
    render(<Button disabled>Save</Button>);
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('marks loading as busy + disabled with a loading data-state', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.getAttribute('data-state')).toBe('loading');
    expect(btn.disabled).toBe(true);
  });

  it('fires onClick when enabled but not when disabled or loading', () => {
    const onClick = vi.fn();

    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} loading>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as its child element via asChild for link semantics', () => {
    render(
      <Button asChild>
        <a href="/next">Continue</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Continue' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/next');
  });

  it('exposes an accessible name for iconOnly buttons via aria-label', () => {
    render(<Button iconOnly aria-label="Close" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
  });

  it('forwards its ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Save</Button>);
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});
