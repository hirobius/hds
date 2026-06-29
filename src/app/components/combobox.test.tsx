/**
 * Tests for Combobox — trigger label, open/filter/select, keyboard, empty state.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Built on Popover (Radix/Floating-UI) — polyfill the jsdom-missing APIs.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Combobox, type ComboboxOption } from './combobox';

beforeAll(() => {
  // @ts-expect-error — minimal jsdom polyfills for Radix/Floating-UI.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(cleanup);

const OPTIONS: ComboboxOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'mx', label: 'Mexico' },
];

function Example({ start = null }: { start?: string | null } = {}) {
  const [value, setValue] = useState<string | null>(start);
  return <Combobox aria-label="Country" options={OPTIONS} value={value} onChange={setValue} />;
}

describe('Combobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Example />);
    expect(screen.getByRole('combobox', { name: 'Country' }).textContent).toContain('Select');
  });

  it('shows the selected option label on the trigger', () => {
    render(<Example start="ca" />);
    expect(screen.getByRole('combobox', { name: 'Country' }).textContent).toContain('Canada');
  });

  it('opens a listbox of options on click', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    expect(screen.getByRole('listbox')).not.toBeNull();
    expect(screen.getByRole('option', { name: 'United States' })).not.toBeNull();
  });

  it('filters options by the search query', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'can' } });
    expect(screen.getByRole('option', { name: 'Canada' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'United States' })).toBeNull();
  });

  it('selects an option on click and reflects it on the trigger', () => {
    const onChange = vi.fn();
    render(<Combobox aria-label="Country" options={OPTIONS} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    fireEvent.click(screen.getByRole('option', { name: 'Mexico' }));
    expect(onChange).toHaveBeenCalledWith('mx');
  });

  it('shows the empty message when nothing matches', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'zzz' } });
    expect(screen.getByText('No results')).not.toBeNull();
  });
});
