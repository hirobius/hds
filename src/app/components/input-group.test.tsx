import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { InputGroup } from './input-group';

afterEach(cleanup);

describe('InputGroup', () => {
  it('renders an input and forwards native props', () => {
    render(<InputGroup placeholder="Search" defaultValue="hi" />);
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement;
    expect(input.tagName.toLowerCase()).toBe('input');
    expect(input.value).toBe('hi');
  });

  it('renders leading and trailing adornments', () => {
    render(<InputGroup leading={<span>$</span>} trailing={<span>USD</span>} aria-label="amount" />);
    expect(screen.getByText('$')).not.toBeNull();
    expect(screen.getByText('USD')).not.toBeNull();
  });

  it('reflects the size on the wrapper data attribute', () => {
    const { container } = render(<InputGroup size="lg" aria-label="x" />);
    expect(container.firstElementChild?.getAttribute('data-size')).toBe('lg');
  });

  it('disables the inner input', () => {
    render(<InputGroup disabled aria-label="x" />);
    expect((screen.getByLabelText('x') as HTMLInputElement).disabled).toBe(true);
  });
});
