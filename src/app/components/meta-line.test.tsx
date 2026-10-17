import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MetaLine } from './meta-line';

afterEach(cleanup);

describe('MetaLine', () => {
  it('renders one item with no separator', () => {
    const { container } = render(<MetaLine items={['Remote']} />);
    expect(container.textContent).toBe('Remote');
    expect(container.querySelectorAll('[data-meta-separator]')).toHaveLength(0);
  });

  it('renders two items with exactly one separator', () => {
    const { container } = render(<MetaLine items={['Acme Cloud', 'Remote']} />);
    expect(container.textContent).toBe('Acme Cloud · Remote');
    expect(container.querySelectorAll('[data-meta-separator]')).toHaveLength(1);
  });

  it('rejects a third item at compile time', () => {
    // @ts-expect-error — max two items per line; use a second MetaLine
    const three = <MetaLine items={['a', 'b', 'c']} />;
    expect(three).toBeTruthy();
  });
});
