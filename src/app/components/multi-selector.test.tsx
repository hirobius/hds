/**
 * Tests for MultiSelector — trigger label, open, and toggling options.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Built on Popover (Radix/Floating-UI) — polyfill the jsdom-missing APIs.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MultiSelector, type MultiSelectorOption } from './multi-selector';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(cleanup);

const OPTIONS: MultiSelectorOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
];

function Example({ start = [] }: { start?: string[] } = {}) {
  const [value, setValue] = useState<string[]>(start);
  return <MultiSelector options={OPTIONS} value={value} onChange={setValue} />;
}

describe('MultiSelector', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Example />);
    expect(screen.getByRole('button').textContent).toContain('Select');
  });

  it('shows a selected count on the trigger', () => {
    render(<Example start={['a', 'b']} />);
    expect(screen.getByRole('button').textContent).toContain('2 selected');
  });

  it('opens the option list from the trigger', () => {
    render(<Example />);
    expect(screen.queryByText('Apple')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Apple')).not.toBeNull();
    expect(screen.getByText('Banana')).not.toBeNull();
    expect(screen.getByText('Cherry')).not.toBeNull();
  });

  it('calls onChange with the option added when toggled on', () => {
    const onChange = vi.fn();
    render(<MultiSelector options={OPTIONS} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Banana' }));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('calls onChange with the option removed when toggled off', () => {
    const onChange = vi.fn();
    render(<MultiSelector options={OPTIONS} value={['a', 'b']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Apple' }));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });
});
