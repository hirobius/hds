/**
 * Tests for SegmentedControl — radiogroup semantics, selected state, onChange.
 * Plain-DOM assertions (no jest-dom). Radix ToggleGroup needs a couple of
 * jsdom polyfills (pointer capture).
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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

  // jsdom has no layout: a 300px rail, 120px segments, 600px of content.
  function layout() {
    const el = rail();
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 600 });
    el.getBoundingClientRect = () => ({ left: 0, right: 300, width: 300 }) as DOMRect;
    screen.getAllByRole('radio').forEach((seg, i) => {
      seg.getBoundingClientRect = () =>
        ({
          left: i * 120 - el.scrollLeft,
          right: i * 120 + 120 - el.scrollLeft,
          width: 120,
        }) as DOMRect;
    });
  }

  let scrollTo: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollTo = vi.fn(function (this: HTMLElement, opts: ScrollToOptions) {
      this.scrollLeft = opts.left ?? 0;
    });
    (HTMLElement.prototype as unknown as { scrollTo: unknown }).scrollTo = scrollTo;
  });
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo;
    vi.unstubAllGlobals();
  });

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
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { rerender } = render(
      <SegmentedControl aria-label="View" value="a" onChange={() => {}} options={MANY} />,
    );
    layout();
    rerender(<SegmentedControl aria-label="View" value="d" onChange={() => {}} options={MANY} />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 180, behavior: 'auto' }); // spacing-ok: asserted scrollTo offset, not layout
  });
});
