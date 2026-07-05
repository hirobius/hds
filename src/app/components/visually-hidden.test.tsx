import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { VisuallyHidden } from './visually-hidden';

afterEach(cleanup);

describe('VisuallyHidden', () => {
  it('renders children within an sr-only span by default', () => {
    render(<VisuallyHidden>Loading</VisuallyHidden>);
    const el = screen.getByText('Loading');
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el.className).toContain('sr-only');
  });

  it('honours the polymorphic `as` prop', () => {
    render(<VisuallyHidden as="h2">Section</VisuallyHidden>);
    expect(screen.getByText('Section').tagName.toLowerCase()).toBe('h2');
  });
});
