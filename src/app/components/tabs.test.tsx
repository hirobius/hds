/**
 * Tests for Tabs — the focus ring must not be clipped by the scrolling list.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
