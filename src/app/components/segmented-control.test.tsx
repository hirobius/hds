/**
 * Tests for SegmentedControl — radiogroup semantics, selected state, onChange.
 * Plain-DOM assertions (no jest-dom). Radix ToggleGroup needs a couple of
 * jsdom polyfills (pointer capture), installed for every suite by
 * tests/setup/jsdom-polyfills.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import {
  installScrollToMock,
  layoutScrollRail,
  restoreScrollTo,
  stubReducedMotion,
} from '../../../tests/primitive-contracts/scroll-rail-fixtures';
import { SegmentedControl } from './segmented-control';

afterEach(cleanup);

const OPTIONS = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
];

describe('SegmentedControl', () => {
  it('renders a radiogroup with the active option checked', () => {
    render(
      <SegmentedControl aria-label="View" value="list" onChange={() => {}} options={OPTIONS} />,
    );
    expect(screen.getByRole('radiogroup', { name: 'View' })).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'List' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Grid' }).getAttribute('aria-checked')).toBe('false');
  });

  it('fires onChange with the chosen value', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl aria-label="View" value="list" onChange={onChange} options={OPTIONS} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
    expect(onChange).toHaveBeenCalledWith('grid');
  });
});

describe('SegmentedControl overflow (hds#823)', () => {
  const MANY = ['a', 'b', 'c', 'd', 'e'].map((v) => ({ value: v, label: v.toUpperCase() }));
  const rail = () => screen.getByRole('radiogroup');

  function layout() {
    layoutScrollRail(rail(), screen.getAllByRole('radio'));
  }

  let scrollTo: ReturnType<typeof installScrollToMock>;
  beforeEach(() => {
    scrollTo = installScrollToMock();
  });
  afterEach(restoreScrollTo);

  it('marks no overflow when the segments fit', () => {
    render(<SegmentedControl aria-label="View" value="a" onChange={() => {}} options={OPTIONS} />);
    expect(rail().getAttribute('data-overflow')).toBeNull();
    expect(rail().style.maskImage).toBe('');
  });

  it('fades the hidden edge like the tab list (data-overflow)', () => {
    render(<SegmentedControl aria-label="View" value="a" onChange={() => {}} options={MANY} />);
    layout();
    fireEvent.scroll(rail());
    expect(rail().getAttribute('data-overflow')).toBe('end');
    expect(rail().style.maskImage).toContain('linear-gradient');
    rail().scrollLeft = 100;
    fireEvent.scroll(rail());
    expect(rail().getAttribute('data-overflow')).toBe('both');
    rail().scrollLeft = 300;
    fireEvent.scroll(rail());
    expect(rail().getAttribute('data-overflow')).toBe('start');
    // The consumer padding still applies beside the mask.
    expect(rail().style.padding).toBe('4px');
  });

  it('scrolls the selected segment into view when the value changes', async () => {
    const { rerender } = render(
      <SegmentedControl aria-label="View" value="a" onChange={() => {}} options={MANY} />,
    );
    layout();
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<SegmentedControl aria-label="View" value="e" onChange={() => {}} options={MANY} />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 300, behavior: 'smooth' });
  });

  it('jumps without smooth scroll under prefers-reduced-motion', async () => {
    stubReducedMotion();
    const { rerender } = render(
      <SegmentedControl aria-label="View" value="a" onChange={() => {}} options={MANY} />,
    );
    layout();
    rerender(<SegmentedControl aria-label="View" value="d" onChange={() => {}} options={MANY} />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 180, behavior: 'auto' }); // spacing-ok: asserted scrollTo offset, not layout
  });
});
