import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AspectRatio } from './aspect-ratio';

afterEach(cleanup);

describe('AspectRatio', () => {
  it('renders its child', () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <img src="/x.png" alt="sample" />
      </AspectRatio>,
    );
    expect(screen.getByAltText('sample')).not.toBeNull();
  });

  it('applies the padding-based ratio box on the wrapper', () => {
    const { container } = render(
      <AspectRatio ratio={2}>
        <div>content</div>
      </AspectRatio>,
    );
    // Radix wraps the child in a position:absolute inset:0 element inside a
    // padding-bottom ratio box; the outer wrapper carries the padding style.
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.paddingBottom).toBe('50%');
  });
});
