import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Kbd } from './kbd';

afterEach(cleanup);

describe('Kbd', () => {
  it('renders children inside a <kbd> element', () => {
    const { container } = render(<Kbd>Esc</Kbd>);
    const el = container.querySelector('kbd');
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('Esc');
  });

  it('defaults the size data attribute to md', () => {
    render(<Kbd>K</Kbd>);
    expect(screen.getByText('K').getAttribute('data-size')).toBe('md');
  });

  it('reflects an explicit size on the data attribute', () => {
    render(<Kbd size="lg">K</Kbd>);
    expect(screen.getByText('K').getAttribute('data-size')).toBe('lg');
  });
});
