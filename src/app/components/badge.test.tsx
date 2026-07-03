/**
 * Tests for Badge — tone data hook, `as` polymorphism, children, ref.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { Badge } from './badge';

afterEach(cleanup);

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>new</Badge>);
    expect(screen.getByText('new')).toBeDefined();
  });

  it('defaults to the neutral tone data hook', () => {
    render(<Badge>x</Badge>);
    expect(screen.getByText('x').getAttribute('data-tone')).toBe('neutral');
  });

  it('reflects an explicit tone on data-tone', () => {
    render(<Badge tone="success">ok</Badge>);
    expect(screen.getByText('ok').getAttribute('data-tone')).toBe('success');
  });

  it('renders as a custom element via `as`', () => {
    render(
      <Badge as="span" tone="danger">
        err
      </Badge>,
    );
    const el = screen.getByText('err');
    expect(el.tagName).toBe('SPAN');
    expect(el.getAttribute('data-tone')).toBe('danger');
  });

  it('forwards its ref', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>x</Badge>);
    expect(ref.current?.getAttribute('data-tone')).toBe('neutral');
  });
});
