/**
 * Tests for Toolbar. Plain-DOM assertions. Radix Toolbar renders inline
 * (no portal), so no jsdom polyfills are needed.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
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

describe('Toolbar compound assembly (hds#365)', () => {
  const PARTS = ['Button', 'Separator', 'ToggleGroup', 'ToggleItem', 'Link'] as const;

  it('does not write the parts onto the Radix Root export', () => {
    expect(Toolbar).not.toBe(ToolbarPrimitive.Root);
    const root = ToolbarPrimitive.Root as unknown as Record<string, unknown>;
    for (const part of PARTS) expect(root[part], `Radix Root.${part}`).toBeUndefined();
  });

  it('keeps every static part and the display name', () => {
    expect(Toolbar.displayName).toBe('Toolbar');
    for (const part of PARTS) expect(Toolbar[part], part).toBeDefined();
  });

  it('still forwards root props to Radix and merges its own classes', () => {
    render(<Toolbar aria-label="Vertical" orientation="vertical" className="mt-2" />);
    const toolbar = screen.getByRole('toolbar', { name: 'Vertical' });
    expect(toolbar.getAttribute('aria-orientation')).toBe('vertical');
    expect(toolbar.classList.contains('mt-2')).toBe(true);
    expect(toolbar.classList.contains('flex')).toBe(true);
  });
});
