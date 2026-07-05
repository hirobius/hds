import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HdsToggleButton } from './hds-toggle-button';

afterEach(cleanup);

describe('HdsToggleButton', () => {
  it('renders unpressed by default', () => {
    render(<HdsToggleButton>Bold</HdsToggleButton>);
    const btn = screen.getByRole('button', { name: 'Bold' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('reflects a controlled pressed state', () => {
    render(<HdsToggleButton pressed>Bold</HdsToggleButton>);
    expect(screen.getByRole('button', { name: 'Bold' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles pressed state on click when uncontrolled', () => {
    render(<HdsToggleButton>Bold</HdsToggleButton>);
    const btn = screen.getByRole('button', { name: 'Bold' });
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('reflects the variant on the data attribute', () => {
    render(<HdsToggleButton variant="ghost">B</HdsToggleButton>);
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('data-variant')).toBe('ghost');
  });
});
