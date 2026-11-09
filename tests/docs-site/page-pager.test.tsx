/** hds#1393: previous / next cards at the bottom of each docs page. */
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PagePager, pagerLabel } from '../../docs-site/components/page-pager';

describe('PagePager (hds#1393)', () => {
  it('renders a labelled nav with two real links in order', () => {
    render(
      <PagePager
        label="Component pages"
        previous={{ url: '/docs/components/accordion', name: 'Accordion' }}
        next={{ url: '/docs/components/avatar', name: 'Avatar' }}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Component pages' });
    const links = nav.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[0]!.getAttribute('href')).toBe('/docs/components/accordion');
    expect(links[0]!.getAttribute('rel')).toBe('prev');
    expect(links[0]!.textContent).toBe('← PreviousAccordion');
    expect(links[1]!.getAttribute('href')).toBe('/docs/components/avatar');
    expect(links[1]!.getAttribute('rel')).toBe('next');
  });

  it('renders only the side that exists, and nothing with neither', () => {
    const { container, rerender } = render(
      <PagePager label="Guide pages" next={{ url: '/docs/guides/b', name: 'B' }} />,
    );
    expect(container.querySelectorAll('a')).toHaveLength(1);
    rerender(<PagePager label="Guide pages" />);
    expect(container.querySelector('nav')).toBeNull();
  });

  it('names the nav after the section', () => {
    expect(pagerLabel(['components', 'alert'])).toBe('Component pages');
    expect(pagerLabel(['foundations', 'color'])).toBe('Foundation pages');
    expect(pagerLabel(['guides', 'x'])).toBe('Guide pages');
  });

  it('stacks on a phone and sits side by side from 640px; the docs page renders it', () => {
    const css = readFileSync('docs-site/app/globals.css', 'utf8');
    expect(css).toMatch(
      /@media \(min-width: 640px\) \{\s*\.hds-page-pager \{\s*grid-template-columns: 1fr 1fr;/,
    );
    const page = readFileSync('docs-site/app/docs/[[...slug]]/page.tsx', 'utf8');
    expect(page).toContain('<PagePager');
    expect(page).toContain('findNeighbour(source.pageTree');
  });
});
