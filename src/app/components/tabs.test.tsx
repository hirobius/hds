/**
 * Tests for Tabs — the focus ring must not be clipped by the scrolling list.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
