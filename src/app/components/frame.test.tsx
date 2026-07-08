import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Frame } from './frame';

afterEach(cleanup);

describe('Frame', () => {
  it('renders children inside the aspect-ratio wrapper', () => {
    render(
      <Frame>
        <img alt="test" src="/test.png" />
      </Frame>,
    );
    expect(screen.getByAltText('test')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    const { container } = render(
      <Frame as="figure">
        <span>content</span>
      </Frame>,
    );
    expect((container.firstChild as HTMLElement).tagName).toBe('FIGURE');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Frame ref={ref}>
        <span>content</span>
      </Frame>,
    );
    expect(ref.current).not.toBeNull();
  });

  it('clips overflow and applies the default md radius token', () => {
    const { container } = render(
      <Frame>
        <span>content</span>
      </Frame>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.borderRadius).toBe('var(--primitive-radius-8)');
  });

  it('applies a different radius token when radius is set', () => {
    const { container } = render(
      <Frame radius="full">
        <span>content</span>
      </Frame>,
    );
    expect((container.firstChild as HTMLElement).style.borderRadius).toBe(
      'var(--primitive-radius-full)',
    );
  });
});
