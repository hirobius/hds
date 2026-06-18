/**
 * Contract test: Surface
 * Verifies that Surface renders with the expected data attributes and
 * padding inline styles for each padding option.
 * ThemeContext has a default value so no Provider is needed.
 *
 * @primitive Surface
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Surface } from '@/app/components/surface';

describe('Surface contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Surface>Content</Surface>);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a div by default', () => {
    const { container } = render(<Surface>Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.tagName.toLowerCase()).toBe('div');
  });

  it('has data-hds-surface="true"', () => {
    const { container } = render(<Surface>Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-hds-surface')).toBe('true');
  });

  it('has data-hds-component="Surface"', () => {
    const { container } = render(<Surface>Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-hds-component')).toBe('Surface');
  });

  it('data-hds-metrics reflects default padding', () => {
    const { container } = render(<Surface>Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-hds-metrics')).toBe('padding:component');
  });

  it('padding="item" is reflected in data-hds-metrics', () => {
    const { container } = render(<Surface padding="item">Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-hds-metrics')).toBe('padding:item');
  });

  it('padding="none" sets inline padding to 0px', () => {
    const { container } = render(<Surface padding="none">Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.style.padding).toBe('0px');
  });

  it('padding="px16" sets inline padding to 16px', () => {
    const { container } = render(<Surface padding="px16">Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.style.padding).toBe('16px');
  });

  it('as prop changes the rendered element', () => {
    const { container } = render(<Surface as="section">Content</Surface>);
    const el = container.querySelector('section');
    expect(el).not.toBeNull();
  });

  it('className prop is forwarded', () => {
    const { container } = render(<Surface className="custom-surface">Content</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el?.classList.contains('custom-surface')).toBe(true);
  });
});
