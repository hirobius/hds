/**
 * Contract test: accessibility rules of the navigation primitives (hds#520):
 * InlineLink, Breadcrumb, Pagination and Tabs.
 *
 * Each `it` title carries the `a11y:<id>` the component's `@a11y component` tags
 * point at, so check-a11y-contracts can prove every rule has a test. Keyboard
 * cases drive a real keyboard (user-event). Class assertions are used only where
 * jsdom has no layout (focus ring, target size).
 *
 * @primitive InlineLink Breadcrumb Pagination Tabs
 */
import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { InlineLink } from '@/app/components/inline-link';
import { Breadcrumb } from '@/app/components/breadcrumb';
import { Pagination } from '@/app/components/pagination';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/tabs';

afterEach(cleanup);

const themeCss = readFileSync(resolve(__dirname, '../../src/styles/theme.css'), 'utf8');

// ── InlineLink ────────────────────────────────────────────────────────────────

describe('InlineLink accessibility contract', () => {
  it('a11y:inline-link.real-anchor - every kind of href renders a real link with its href', () => {
    render(
      <>
        <InlineLink href="/docs">Internal</InlineLink>
        <InlineLink href="https://example.com">External</InlineLink>
        <InlineLink href="#top">Hash</InlineLink>
      </>,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/docs',
      'https://example.com',
      '#top',
    ]);
    for (const a of links) expect(a.tagName).toBe('A');
  });

  it('a11y:inline-link.keyboard-reach - Tab reaches each link in order', async () => {
    const user = userEvent.setup();
    render(
      <>
        <InlineLink href="/a">First</InlineLink>
        <InlineLink href="/b">Second</InlineLink>
      </>,
    );
    await user.tab();
    expect(document.activeElement?.textContent).toBe('First');
    await user.tab();
    expect(document.activeElement?.textContent).toBe('Second');
  });

  it('a11y:inline-link.new-tab-notice - an external link says it opens a new tab, and its icon is decorative', () => {
    render(<InlineLink href="https://example.com">Example</InlineLink>);
    const a = screen.getByRole('link', { name: /Example/ });
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.textContent).toContain('(opens in new tab)');
    expect(a.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a11y:inline-link.focus-ring - the link carries the shared focus ring class', () => {
    render(<InlineLink href="/x">Go</InlineLink>);
    expect(screen.getByRole('link').className).toContain('hds-focus');
    expect(themeCss).toMatch(/\.hds-focus:focus-visible\s*\{[^}]*outline/);
  });

  it('a11y:inline-link.not-colour-only - the .hds-link style underlines at rest', () => {
    render(<InlineLink href="/x">Go</InlineLink>);
    expect(screen.getByRole('link').className).toContain('hds-link');
    const rule = themeCss.match(/\.hds-link\s*\{([^}]*)\}/);
    expect(rule, '.hds-link rule in theme.css').toBeTruthy();
    expect(rule![1]).toMatch(/text-decoration(-line)?\s*:\s*[^;]*underline/);
  });
});

// ── Breadcrumb ────────────────────────────────────────────────────────────────

const crumbs = [{ label: 'Home', href: '/' }, { label: 'Docs', href: '/docs' }, { label: 'Page' }];

describe('Breadcrumb accessibility contract', () => {
  it('a11y:breadcrumb.nav-landmark - the trail is a navigation landmark with a name, overridable', () => {
    const { rerender } = render(<Breadcrumb items={crumbs} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).not.toBeNull();
    rerender(<Breadcrumb items={crumbs} label="You are here" />);
    expect(screen.getByRole('navigation', { name: 'You are here' })).not.toBeNull();
  });

  it('a11y:breadcrumb.ordered-list - the trail is an ordered list of its crumbs', () => {
    render(<Breadcrumb items={crumbs} />);
    const list = within(screen.getByRole('navigation')).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('a11y:breadcrumb.current-page - the last crumb is aria-current=page and is not a link', () => {
    render(<Breadcrumb items={[...crumbs.slice(0, 2), { label: 'Page', href: '/page' }]} />);
    const current = screen.getByText('Page');
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.closest('a')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('a11y:breadcrumb.separators-hidden - the chevron separators are hidden from assistive tech', () => {
    const { container } = render(<Breadcrumb items={crumbs} />);
    const separators = container.querySelectorAll('li > svg');
    expect(separators).toHaveLength(2);
    for (const svg of separators) expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('a11y:breadcrumb.keyboard-focus - Tab visits each link in trail order and each draws the focus ring', async () => {
    const user = userEvent.setup();
    render(<Breadcrumb items={crumbs} />);
    await user.tab();
    expect(document.activeElement?.textContent).toBe('Home');
    expect(document.activeElement?.className).toContain('hds-focus');
    await user.tab();
    expect(document.activeElement?.textContent).toBe('Docs');
    await user.tab();
    expect(document.activeElement).toBe(document.body);
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

function PagedFixture({ start = 3, count = 10 }: { start?: number; count?: number }) {
  const [page, setPage] = useState(start);
  return <Pagination page={page} count={count} onPageChange={setPage} />;
}

describe('Pagination accessibility contract', () => {
  it('a11y:pagination.nav-landmark - it is a navigation landmark with a default name, overridable', () => {
    const { rerender } = render(<Pagination page={1} count={5} onPageChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).not.toBeNull();
    rerender(<Pagination page={1} count={5} onPageChange={() => {}} label="Results pages" />);
    expect(screen.getByRole('navigation', { name: 'Results pages' })).not.toBeNull();
  });

  it('a11y:pagination.control-names - Previous, Next and each page number have a name', () => {
    render(<Pagination page={3} count={10} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Page 3' })).not.toBeNull();
    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('aria-label') || button.textContent).toBeTruthy();
    }
  });

  it('a11y:pagination.current-page - only the current page is aria-current=page', () => {
    render(<Pagination page={4} count={10} onPageChange={() => {}} />);
    const current = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current.map((b) => b.getAttribute('aria-label'))).toEqual(['Page 4']);
  });

  it('a11y:pagination.disabled-ends - Previous is disabled on page 1 and Next on the last page', () => {
    const { rerender } = render(<Pagination page={1} count={5} onPageChange={() => {}} />);
    expect(
      (screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    rerender(<Pagination page={5} count={5} onPageChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('a11y:pagination.ellipsis-hidden - the truncation ellipsis is hidden from assistive tech', () => {
    const { container } = render(<Pagination page={10} count={20} onPageChange={() => {}} />);
    const ellipses = [...container.querySelectorAll('li')].filter((li) => li.textContent === '…');
    expect(ellipses).toHaveLength(2);
    for (const li of ellipses) expect(li.getAttribute('aria-hidden')).toBe('true');
  });

  it('a11y:pagination.keyboard - Tab reaches each control and Enter and Space change the page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={2} count={6} onPageChange={onPageChange} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Previous page' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Page 1' }));
    await user.keyboard('{Enter}');
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Page 3' }));
    await user.keyboard(' ');
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it('a11y:pagination.focus-kept - activating Previous on page 2 never leaves focus on the control that just disabled', async () => {
    const user = userEvent.setup();
    render(<PagedFixture start={2} count={5} />);
    const previous = screen.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement;
    await user.tab();
    expect(document.activeElement).toBe(previous);
    await user.keyboard('{Enter}');
    // Page 1 now: Previous is disabled and cannot take keys, so focus must have moved on.
    expect(previous.disabled).toBe(true);
    expect(document.activeElement).not.toBe(previous);
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByRole('navigation').contains(document.activeElement)).toBe(true);
    // The rule names the destination: the current page button, not just "somewhere in the nav".
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Page 1' }));
    expect(document.activeElement?.getAttribute('aria-current')).toBe('page');
  });

  it('a11y:pagination.focus-kept - activating Next on the second-last page moves focus to the current page', async () => {
    const user = userEvent.setup();
    render(<PagedFixture start={4} count={5} />);
    const next = screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement;
    next.focus();
    await user.keyboard('{Enter}');
    expect(next.disabled).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Page 5' }));
    expect(document.activeElement?.getAttribute('aria-current')).toBe('page');
  });

  it('a11y:pagination.target-size - page buttons lift to the touch target and Previous/Next are at least 24px', () => {
    render(<Pagination page={3} count={10} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Page 3' }).className).toContain('hds-touch-target');
    for (const name of ['Previous page', 'Next page']) {
      const cls = screen.getByRole('button', { name }).className.split(/\s+/);
      // size sm: h-8 w-8 = 32px, over the 24px floor (WCAG 2.5.8)
      expect(cls).toContain('h-8');
      expect(cls).toContain('w-8');
    }
    expect(themeCss).toMatch(
      /\.hds-touch-target\s*\{[^}]*min-height:\s*var\(--primitive-size-interactive-min\)/,
    );
  });
});

// ── Tabs ──────────────────────────────────────────────────────────────────────

function TabsFixture({ disabledB = false }: { disabledB?: boolean }) {
  return (
    <>
      <button type="button">before</button>
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">One</TabsTrigger>
          <TabsTrigger value="b" disabled={disabledB}>
            Two
          </TabsTrigger>
          <TabsTrigger value="c">Three</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </Tabs>
    </>
  );
}

describe('Tabs accessibility contract', () => {
  it('a11y:tabs.roles - tablist, tab and tabpanel roles with aria-selected, aria-controls and aria-labelledby', () => {
    render(<TabsFixture />);
    const list = screen.getByRole('tablist', { name: 'Sections' });
    const tabs = within(list).getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    const panel = screen.getByRole('tabpanel');
    expect(tabs[0].getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(panel.textContent).toBe('Panel A');
  });

  it('a11y:tabs.single-tab-stop - Tab enters the tablist on the selected tab only, then moves to the panel', async () => {
    const user = userEvent.setup();
    render(<TabsFixture />);
    const tabs = screen.getAllByRole('tab');
    await user.tab(); // before
    await user.tab();
    expect(document.activeElement).toBe(tabs[0]);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('tabpanel'));
  });

  it('a11y:tabs.arrow-keys - Left and Right move between tabs and select them, wrapping, Home and End jump to the ends', async () => {
    const user = userEvent.setup();
    render(<TabsFixture />);
    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.textContent).toBe('Two');
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel B');
    await user.keyboard('{End}');
    expect(document.activeElement?.textContent).toBe('Three');
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel C');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.textContent).toBe('One');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement?.textContent).toBe('Three');
    await user.keyboard('{Home}');
    expect(document.activeElement?.textContent).toBe('One');
  });

  it('a11y:tabs.disabled-skipped - arrow keys skip a disabled tab', async () => {
    const user = userEvent.setup();
    render(<TabsFixture disabledB />);
    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.textContent).toBe('Three');
  });

  it('a11y:tabs.panel-focus - the active panel is focusable so keyboard users can scroll it', () => {
    render(<TabsFixture />);
    expect(screen.getByRole('tabpanel').getAttribute('tabindex')).toBe('0');
  });

  it('a11y:tabs.focus-ring - the trigger ring is inset so the scrolling list does not clip it', () => {
    render(<TabsFixture />);
    expect(screen.getByRole('tablist').className).toContain('overflow-x-auto');
    for (const tab of screen.getAllByRole('tab')) {
      const cls = tab.className.split(/\s+/);
      expect(cls).toContain('focus-visible:ring-2');
      expect(cls).toContain('focus-visible:ring-inset');
    }
  });

  it('a11y:tabs.target-size - the tab strip is 40px tall, over the 24px floor', () => {
    render(<TabsFixture />);
    expect(screen.getByRole('tablist').className.split(/\s+/)).toContain('h-10');
  });
});
