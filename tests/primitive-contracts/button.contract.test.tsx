/**
 * Contract test: Button
 * Verifies that variant and size props produce the expected Tailwind classes
 * on the rendered button element.
 *
 * @primitive Button
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/app/components/button';

describe('Button contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Button>Label</Button>);
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('has role="button"', () => {
    const { container } = render(<Button>Label</Button>);
    const el = container.querySelector('button');
    expect(el?.tagName.toLowerCase()).toBe('button');
  });

  it('variant=primary emits bg-primary class', () => {
    const { container } = render(<Button variant="primary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('bg-primary');
  });

  it('variant=secondary emits border class', () => {
    const { container } = render(<Button variant="secondary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('border');
  });

  it('variant=tertiary does not emit bg-primary', () => {
    const { container } = render(<Button variant="tertiary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).not.toContain('bg-primary');
  });

  it('size=sm emits h-8 class', () => {
    const { container } = render(<Button size="sm">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('h-8');
  });

  it('size=md emits h-10 class', () => {
    const { container } = render(<Button size="md">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('h-10');
  });

  it('size=lg emits h-12 class', () => {
    const { container } = render(<Button size="lg">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.className).toContain('h-12');
  });

  it('data-variant attribute reflects the variant prop', () => {
    const { container } = render(<Button variant="primary">Label</Button>);
    const el = container.querySelector('button');
    expect(el?.getAttribute('data-variant')).toBe('primary');
  });

  it('loading=true sets aria-busy', () => {
    const { container } = render(<Button loading>Label</Button>);
    const el = container.querySelector('button');
    expect(el?.getAttribute('aria-busy')).toBe('true');
  });

  it('disabled=true disables the button', () => {
    const { container } = render(<Button disabled>Label</Button>);
    const el = container.querySelector('button') as HTMLButtonElement;
    expect(el?.disabled).toBe(true);
  });
});
