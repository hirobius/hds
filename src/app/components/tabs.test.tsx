/**
 * Tests for Tabs — the focus ring must not be clipped by the scrolling list.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

afterEach(cleanup);

function Example() {
  return (
    <Tabs defaultValue="a">
      <TabsList aria-label="Sections">
        <TabsTrigger value="a">One</TabsTrigger>
        <TabsTrigger value="b">Two</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A</TabsContent>
      <TabsContent value="b">B</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders tabs and the active panel', () => {
    render(<Example />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tabpanel').textContent).toBe('A');
  });

  it('draws the focus ring inset, so the scrolling list (overflow-x-auto) cannot clip it', () => {
    render(<Example />);
    const list = screen.getByRole('tablist');
    expect(list.className).toContain('overflow-x-auto');
    for (const tab of screen.getAllByRole('tab')) {
      const cls = tab.className.split(/\s+/);
      expect(cls).toContain('focus-visible:ring-2');
      expect(cls).toContain('focus-visible:ring-inset');
    }
  });
});

describe('TabsList overflow cue (hds#723)', () => {
  const list = () => screen.getByRole('tablist');
  const setMetrics = (el: HTMLElement, m: { scrollWidth: number; clientWidth: number }) => {
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: m.scrollWidth });
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: m.clientWidth });
  };

  it('marks no overflow when the tabs fit', () => {
    render(<Example />);
    expect(list().getAttribute('data-overflow')).toBeNull();
  });

  it('marks the trailing edge when tabs overflow, and the leading edge once scrolled', () => {
    render(<Example />);
    setMetrics(list(), { scrollWidth: 600, clientWidth: 300 });
    fireEvent.scroll(list());
    expect(list().getAttribute('data-overflow')).toBe('end');
    list().scrollLeft = 100;
    fireEvent.scroll(list());
    expect(list().getAttribute('data-overflow')).toBe('both');
    list().scrollLeft = 300;
    fireEvent.scroll(list());
    expect(list().getAttribute('data-overflow')).toBe('start');
  });
});

describe('TabsList keeps the selected tab in view (hds#823)', () => {
  // jsdom has no layout: give the list a 300px box and each tab a 120px slot.
  function layout(list: HTMLElement) {
    Object.defineProperty(list, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(list, 'scrollWidth', { configurable: true, value: 600 });
    list.getBoundingClientRect = () => ({ left: 0, right: 300, width: 300 }) as DOMRect;
    list.querySelectorAll<HTMLElement>('[role="tab"]').forEach((tab, i) => {
      tab.getBoundingClientRect = () =>
        ({
          left: i * 120 - list.scrollLeft,
          right: i * 120 + 120 - list.scrollLeft,
          width: 120,
        }) as DOMRect;
    });
  }

  function Many({ value, onValueChange }: { value?: string; onValueChange?: (v: string) => void }) {
    return (
      <Tabs value={value} defaultValue={value ? undefined : 'a'} onValueChange={onValueChange}>
        <TabsList aria-label="Sections" ref={(el) => el && layout(el)}>
          {['a', 'b', 'c', 'd', 'e'].map((v) => (
            <TabsTrigger key={v} value={v}>
              {v}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
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

  it('scrolls a selected tab past the edge into view on mount, instantly', () => {
    render(<Many value="e" />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    // Tab e ends at 600; the list shows 300, so scroll to 300 (no fade var in jsdom).
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 300, behavior: 'auto' });
  });

  it('does not scroll when the selected tab is already in view', () => {
    render(<Many value="a" />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls smoothly to a newly selected tab', async () => {
    const { rerender } = render(<Many value="a" />);
    rerender(<Many value="d" />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 180, behavior: 'smooth' });
  });

  it('does not smooth-scroll under prefers-reduced-motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { rerender } = render(<Many value="a" />);
    rerender(<Many value="d" />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 180, behavior: 'auto' });
  });
});

describe('TabsContent variant (hds#819)', () => {
  function Panel({ variant }: { variant?: 'panel' | 'bare' }) {
    return (
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">One</TabsTrigger>
        </TabsList>
        <TabsContent value="a" variant={variant}>
          A
        </TabsContent>
      </Tabs>
    );
  }
  const cls = () => screen.getByRole('tabpanel').className.split(/\s+/);

  it('defaults to the tinted panel pulled up under the strip', () => {
    render(<Panel />);
    expect(cls()).toEqual(expect.arrayContaining(['bg-accent/5', 'rounded-b-md', 'p-6', '-mt-6']));
  });

  it('bare drops the fill, padding, radius and pull-up', () => {
    render(<Panel variant="bare" />);
    for (const c of ['bg-accent/5', 'rounded-b-md', 'p-6', '-mt-6']) expect(cls()).not.toContain(c);
  });
});
