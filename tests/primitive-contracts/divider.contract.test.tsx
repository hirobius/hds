/**
 * Contract test: Divider
 * Verifies that orientation and strong/variant props produce the expected
 * cva-driven border-token class and aria attributes (converted off inline
 * `style.borderTop`/`style.borderLeft` for #60 — see
 * src/app/components/divider.tsx).
 *
 * @primitive Divider
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Divider } from '@/app/components/divider';

describe('Divider contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('renders an <hr> element', () => {
    const { container } = render(<Divider />);
    const el = container.querySelector('hr');
    expect(el?.tagName.toLowerCase()).toBe('hr');
  });

  it('horizontal orientation sets aria-orientation="horizontal"', () => {
    const { container } = render(<Divider orientation="horizontal" />);
    const el = container.querySelector('hr');
    expect(el?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('vertical orientation sets aria-orientation="vertical"', () => {
    const { container } = render(<Divider orientation="vertical" />);
    const el = container.querySelector('hr');
    expect(el?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('default orientation is horizontal', () => {
    const { container } = render(<Divider />);
    const el = container.querySelector('hr');
    expect(el?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('strong=false uses the default border token class', () => {
    const { container } = render(<Divider strong={false} />);
    const el = container.querySelector('hr') as HTMLElement;
    expect(el?.className).toContain('semantic-color-border-default');
  });

  it('strong=true uses the strong border token class', () => {
    const { container } = render(<Divider strong={true} />);
    const el = container.querySelector('hr') as HTMLElement;
    expect(el?.className).toContain('semantic-color-border-strong');
  });

  it('variant="strong" uses the strong border token class (new prop, same as strong=true)', () => {
    const { container } = render(<Divider variant="strong" />);
    const el = container.querySelector('hr') as HTMLElement;
    expect(el?.className).toContain('semantic-color-border-strong');
  });

  it('className prop is applied to the hr element', () => {
    const { container } = render(<Divider className="my-divider" />);
    const el = container.querySelector('hr');
    expect(el?.classList.contains('my-divider')).toBe(true);
  });
});
