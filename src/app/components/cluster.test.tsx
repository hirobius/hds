import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Cluster } from './cluster';

afterEach(cleanup);

describe('Cluster', () => {
  it('renders a div by default and forwards children', () => {
    render(<Cluster>content</Cluster>);
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    const { container } = render(<Cluster as="section">content</Cluster>);
    expect((container.firstChild as HTMLElement).tagName).toBe('SECTION');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Cluster ref={ref}>content</Cluster>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('applies flex-wrap and the tokenized gap for the given semantic step', () => {
    const { container } = render(<Cluster gap="spacious">content</Cluster>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.display).toBe('flex');
    expect(el.style.flexWrap).toBe('wrap');
    expect(el.style.gap).toBe('var(--semantic-space-layout-spacious)');
  });

  it('defaults to align=center, justify=start', () => {
    const { container } = render(<Cluster>content</Cluster>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.alignItems).toBe('center');
    expect(el.style.justifyContent).toBe('flex-start');
  });
});
