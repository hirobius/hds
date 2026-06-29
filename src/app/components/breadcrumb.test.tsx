/**
 * Tests for Breadcrumb — nav landmark, current-page marking, and anchor links
 * via the router seam's default (no provider). Plain-DOM assertions.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Breadcrumb } from './breadcrumb';

afterEach(cleanup);

const items = [
  { label: 'Home', href: '/' },
  { label: 'Components', href: '/components' },
  { label: 'Breadcrumb' },
];

describe('Breadcrumb', () => {
  it('renders a labelled navigation landmark', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).not.toBeNull();
  });

  it('marks the last crumb as the current page and does not link it', () => {
    const { container } = render(<Breadcrumb items={items} />);
    const current = screen.getByText('Breadcrumb');
    expect(current.getAttribute('aria-current')).toBe('page');
    // Only the two non-final crumbs are links.
    expect(container.querySelectorAll('a').length).toBe(2);
  });

  it('renders intermediate crumbs as anchors with hrefs (router-free default)', () => {
    render(<Breadcrumb items={items} />);
    const link = screen.getByText('Components') as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/components');
  });
});
