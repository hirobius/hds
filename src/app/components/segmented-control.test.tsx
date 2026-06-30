/**
 * Tests for SegmentedControl — radiogroup semantics, selected state, onChange.
 * Plain-DOM assertions (no jest-dom). Radix ToggleGroup needs a couple of
 * jsdom polyfills (pointer capture).
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SegmentedControl } from './segmented-control';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

const OPTIONS = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
];

describe('SegmentedControl', () => {
  it('renders a radiogroup with the active option checked', () => {
    render(<SegmentedControl aria-label="View" value="list" onChange={() => {}} options={OPTIONS} />);
    expect(screen.getByRole('radiogroup', { name: 'View' })).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'List' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Grid' }).getAttribute('aria-checked')).toBe('false');
  });

  it('fires onChange with the chosen value', () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="View" value="list" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
    expect(onChange).toHaveBeenCalledWith('grid');
  });
});
