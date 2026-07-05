import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ToggleButton } from './toggle-button';

afterEach(cleanup);

describe('ToggleButton', () => {
  it('renders unpressed by default', () => {
    render(<ToggleButton>Bold</ToggleButton>);
    const btn = screen.getByRole('button', { name: 'Bold' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('reflects a controlled pressed state', () => {
    render(<ToggleButton pressed>Bold</ToggleButton>);
    expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles pressed state on click when uncontrolled', () => {
    render(<ToggleButton>Bold</ToggleButton>);
    const btn = screen.getByRole('button', { name: 'Bold' });
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('reflects the variant on the data attribute', () => {
    render(<ToggleButton variant="ghost">B</ToggleButton>);
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('data-variant')).toBe('ghost');
  });
});
