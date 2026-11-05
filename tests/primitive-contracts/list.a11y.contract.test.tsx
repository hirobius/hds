/**
 * Contract test: accessibility rules of the inset grouped List.
 *
 * Each `it` title carries the `a11y:<id>` the component's `@a11y component` tags
 * point at, so check-a11y-contracts can prove every rule has a test.
 *
 * @primitive List
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell } from 'lucide-react';
import { List } from '@/app/components/list';
import { Menu } from '@/app/components/menu';

afterEach(cleanup);

describe('List accessibility contract', () => {
  it('a11y:list.list-semantics - each group is a ul of li rows, named by its heading', () => {
    render(
      <List>
        <List.Group title="Applications" count={2}>
          <List.Item href="/a" title="Staff engineer" />
          <List.Item href="/b" title="Design lead" />
        </List.Group>
      </List>,
    );
    const list = screen.getByRole('list', { name: /Applications/ });
    expect(list.tagName).toBe('UL');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    for (const li of rows) expect(li.tagName).toBe('LI');
  });

  it('a11y:list.row-name - the row link is named by its title, not its description or meta', () => {
    render(
      <List>
        <List.Group title="Roles">
          <List.Item
            href="/a"
            title="Staff engineer"
            description="Remote, full time"
            meta="Applied 2 days ago"
            leading={<List.Tile icon={Bell} />}
            trailing="chevron"
          />
        </List.Group>
      </List>,
    );
    const link = screen.getByRole('link', { name: 'Staff engineer' });
    expect(link.getAttribute('href')).toBe('/a');
    const described = (link.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['Remote, full time', 'Applied 2 days ago']);
  });

  it('a11y:list.select-button - with onSelect the row is a button named by its title', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <List>
        <List.Group title="Roles">
          <List.Item onSelect={onSelect} title="Staff engineer" description="Remote" />
        </List.Group>
      </List>,
    );
    const button = screen.getByRole('button', { name: 'Staff engineer' });
    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(button.className).toContain('hds-focus');
  });

  it('a11y:list.overflow-menu - secondary actions sit in a Menu trigger named for the row, outside the row link', () => {
    render(
      <List>
        <List.Group title="Roles">
          <List.Item
            href="/a"
            title="Staff engineer"
            actions={<Menu.Item onSelect={() => {}}>Archive</Menu.Item>}
          />
        </List.Group>
      </List>,
    );
    const link = screen.getByRole('link', { name: 'Staff engineer' });
    const trigger = screen.getByRole('button', { name: 'More actions for Staff engineer' });
    expect(link.contains(trigger)).toBe(false);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('a11y:list.decorative-affordances - the chevron and leading icon tile are hidden from assistive technology', () => {
    const { container } = render(
      <List>
        <List.Group title="Roles">
          <List.Item
            href="/a"
            title="Staff engineer"
            leading={<List.Tile icon={Bell} />}
            trailing="chevron"
          />
        </List.Group>
      </List>,
    );
    const slots = container.querySelectorAll(
      '[data-slot="list-leading"], [data-slot="list-trailing"]',
    );
    expect(slots).toHaveLength(2);
    for (const slot of slots) expect(slot.getAttribute('aria-hidden')).toBe('true');
  });
});
