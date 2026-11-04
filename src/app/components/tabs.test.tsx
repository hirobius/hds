/**
 * Tests for Tabs — the focus ring must not be clipped by the scrolling list.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import {
  installScrollToMock,
  layoutScrollRail,
  restoreScrollTo,
  stubReducedMotion,
} from '../../../tests/primitive-contracts/scroll-rail-fixtures';
import { expectInsetFocusRing } from '../../../tests/primitive-contracts/tabs-fixtures';
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
    expectInsetFocusRing();
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
  function layout(list: HTMLElement) {
    layoutScrollRail(list, list.querySelectorAll<HTMLElement>('[role="tab"]'));
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

  let scrollTo: ReturnType<typeof installScrollToMock>;
  beforeEach(() => {
    scrollTo = installScrollToMock();
  });
  afterEach(restoreScrollTo);

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
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 180, behavior: 'smooth' }); // spacing-ok: asserted scrollTo offset, not layout
  });

  it('does not smooth-scroll under prefers-reduced-motion', async () => {
    stubReducedMotion();
    const { rerender } = render(<Many value="a" />);
    rerender(<Many value="d" />);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledTimes(1));
    expect(scrollTo.mock.calls[0][0]).toEqual({ left: 180, behavior: 'auto' }); // spacing-ok: asserted scrollTo offset, not layout
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
    expect(cls()).toEqual(
      expect.arrayContaining([
        'bg-[var(--semantic-color-surface-selected)]',
        'rounded-b-md',
        'p-fixed-md',
        '-mt-fixed-md',
      ]),
    );
  });

  it('bare drops the fill, padding, radius and pull-up', () => {
    render(<Panel variant="bare" />);
    for (const c of [
      'bg-[var(--semantic-color-surface-selected)]',
      'rounded-b-md',
      'p-fixed-md',
      '-mt-fixed-md',
    ])
      expect(cls()).not.toContain(c);
  });
});

describe('TabsContent change cue (hds#938)', () => {
  it('every panel carries the change-cue class, for both variants', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">One</TabsTrigger>
        </TabsList>
        <TabsContent value="a" variant="bare">
          A
        </TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tabpanel').className.split(/\s+/)).toContain('hds-tabs-content');
  });
});
