/**
 * Contract test: accessibility rules of PageHeader's title menu (hds#1150).
 *
 * Each `it` title carries the `a11y:<id>` the component's `@a11y component` tags
 * point at, so check-a11y-contracts can prove every rule has a test.
 *
 * @primitive PageHeader
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageHeader } from '@/app/components/page-header';
import { Menu } from '@/app/components/menu';

afterEach(cleanup);

const items = (
  <>
    <Menu.Item>Rename</Menu.Item>
    <Menu.Item>Duplicate</Menu.Item>
  </>
);

describe('PageHeader title menu accessibility contract', () => {
  it('a11y:page-header.title-menu-named - the title menu trigger is a button named by titleMenuLabel that says it opens a menu', () => {
    render(<PageHeader title="Acme" titleMenu={items} titleMenuLabel="Acme options" />);
    const trigger = screen.getByRole('button', { name: 'Acme options' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // The heading keeps its own name: the trigger sits beside it, not inside it.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Acme');
  });

  it('a11y:page-header.title-menu-keyboard - Tab reaches the trigger, Enter opens the menu on its first item, Escape closes it and returns focus', async () => {
    const u = userEvent.setup();
    render(<PageHeader title="Acme" titleMenu={items} titleMenuLabel="Acme options" />);
    await u.tab();
    const trigger = screen.getByRole('button', { name: 'Acme options' });
    expect(document.activeElement).toBe(trigger);
    await u.keyboard('{Enter}');
    const menuItems = await screen.findAllByRole('menuitem');
    await waitFor(() => expect(document.activeElement).toBe(menuItems[0]));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});
