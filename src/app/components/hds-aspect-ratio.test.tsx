import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsAspectRatio } from './hds-aspect-ratio';

afterEach(cleanup);

describe('HdsAspectRatio', () => {
  it('renders its child', () => {
    render(
      <HdsAspectRatio ratio={16 / 9}>
        <img src="/x.png" alt="sample" />
      </HdsAspectRatio>,
    );
    expect(screen.getByAltText('sample')).not.toBeNull();
  });

  it('applies the padding-based ratio box on the wrapper', () => {
    const { container } = render(
      <HdsAspectRatio ratio={2}>
        <div>content</div>
      </HdsAspectRatio>,
    );
    // Radix wraps the child in a position:absolute inset:0 element inside a
    // padding-bottom ratio box; the outer wrapper carries the padding style.
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.paddingBottom).toBe('50%');
  });
});
