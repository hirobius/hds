/**
 * Tests for Toolbar. Plain-DOM assertions. Radix Toolbar renders inline
 * (no portal), so no jsdom polyfills are needed.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Toolbar } from './toolbar';

afterEach(cleanup);

function Example() {
  return (
    <Toolbar aria-label="Formatting">
      <Toolbar.ToggleGroup type="single" aria-label="Text style">
        <Toolbar.ToggleItem value="bold">Bold</Toolbar.ToggleItem>
        <Toolbar.ToggleItem value="italic">Italic</Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>
      <Toolbar.Separator />
      <Toolbar.Button>Share</Toolbar.Button>
    </Toolbar>
  );
}

describe('Toolbar', () => {
  it('renders a toolbar landmark', () => {
    render(<Example />);
    expect(screen.getByRole('toolbar', { name: 'Formatting' })).not.toBeNull();
  });

  it('renders Toolbar.Button children', () => {
    render(<Example />);
    expect(screen.getByText('Share')).not.toBeNull();
  });

  it('renders a separator', () => {
    render(<Example />);
    expect(screen.getByRole('separator')).not.toBeNull();
  });

  it('toggles a ToggleGroup item to data-state="on" on click', () => {
    render(<Example />);
    const bold = screen.getByText('Bold');
    expect(bold.getAttribute('data-state')).toBe('off');
    fireEvent.click(bold);
    expect(bold.getAttribute('data-state')).toBe('on');
  });
});
