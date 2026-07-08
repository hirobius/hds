import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Center } from './center';

afterEach(cleanup);

describe('Center', () => {
  it('renders a div by default and forwards children', () => {
    render(<Center>content</Center>);
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    const { container } = render(<Center as="main">content</Center>);
    expect((container.firstChild as HTMLElement).tagName).toBe('MAIN');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Center ref={ref}>content</Center>);
    expect(ref.current).not.toBeNull();
  });

  it('centers via auto margins and applies the semantic max-width token', () => {
    const { container } = render(<Center maxWidth="max">content</Center>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.marginLeft).toBe('auto');
    expect(el.style.marginRight).toBe('auto');
    expect(el.style.maxWidth).toBe('var(--semantic-layout-width-max)');
  });

  it('applies no horizontal padding when gutter is omitted', () => {
    const { container } = render(<Center>content</Center>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.paddingLeft).toBe('');
  });

  it('applies a tokenized horizontal gutter when set', () => {
    const { container } = render(<Center gutter="normal">content</Center>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.paddingLeft).toBe('var(--semantic-space-layout-normal)');
    expect(el.style.paddingRight).toBe('var(--semantic-space-layout-normal)');
  });
});
