import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Cover } from './cover';

afterEach(cleanup);

describe('Cover', () => {
  it('renders children as the main region', () => {
    render(<Cover>main content</Cover>);
    expect(screen.getByText('main content')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    const { container } = render(<Cover as="section">main</Cover>);
    expect((container.firstChild as HTMLElement).tagName).toBe('SECTION');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Cover ref={ref}>main</Cover>);
    expect(ref.current).not.toBeNull();
  });

  it('defaults to a column flex layout with minHeight 100svh and the tokenized gap', () => {
    const { container } = render(<Cover>main</Cover>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.display).toBe('flex');
    expect(el.style.flexDirection).toBe('column');
    expect(el.style.minHeight).toBe('100svh');
    expect(el.style.gap).toBe('var(--semantic-space-layout-normal)');
  });

  it('renders optional header and footer around the auto-margin-centered main region', () => {
    render(
      <Cover header={<span>header</span>} footer={<span>footer</span>}>
        main
      </Cover>,
    );
    expect(screen.getByText('header')).not.toBeNull();
    expect(screen.getByText('footer')).not.toBeNull();
    expect(screen.getByText('main').style.marginTop).toBe('auto');
    expect(screen.getByText('main').style.marginBottom).toBe('auto');
  });

  it('prefers centerSlot over children when both are set', () => {
    render(<Cover centerSlot={<span>from-slot</span>}>from-children</Cover>);
    expect(screen.getByText('from-slot')).not.toBeNull();
    expect(screen.queryByText('from-children')).toBeNull();
  });

  it('accepts a custom minHeight', () => {
    const { container } = render(<Cover minHeight="100vh">main</Cover>);
    expect((container.firstChild as HTMLElement).style.minHeight).toBe('100vh');
  });
});
