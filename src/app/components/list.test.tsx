import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { Bell, Star } from 'lucide-react';
import { List } from './list';
import { Button } from './button';
import { Icon } from './icon';
import { Menu } from './menu';

afterEach(cleanup);

const slotsOf = (row: HTMLElement) =>
  Array.from(row.querySelectorAll<HTMLElement>('[data-slot^="list-"]')).map(
    (el) => el.dataset.slot,
  );

describe('List', () => {
  it('renders the group heading outside the surface, with a count Badge and an action', () => {
    const { container } = render(
      <List>
        <List.Group title="Saved roles" count={3} action={<Button variant="link">See all</Button>}>
          <List.Item href="/a" title="One" />
        </List.Group>
      </List>,
    );
    const heading = screen.getByRole('heading', { name: /Saved roles/ });
    const surface = container.querySelector('ul') as HTMLElement;
    expect(surface.contains(heading)).toBe(false);
    expect(surface.getAttribute('data-hds-surface')).toBe('true');
    const header = container.querySelector('[data-slot="list-group-header"]') as HTMLElement;
    expect(header.textContent).toContain('3');
    expect(within(header).getByRole('button', { name: 'See all' })).toBeTruthy();
  });

  it('orders the row slots leading, title, description, meta, trailing', () => {
    render(
      <List>
        <List.Group title="Roles">
          <List.Item
            href="/a"
            trailing="chevron"
            meta="2 days ago"
            description="Remote"
            title="Staff engineer"
            leading={<List.Tile icon={Bell} />}
          />
        </List.Group>
      </List>,
    );
    const row = screen.getByRole('listitem');
    expect(slotsOf(row)).toEqual([
      'list-leading',
      'list-title',
      'list-description',
      'list-meta',
      'list-trailing',
    ]);
    expect(row.querySelector('[data-slot="list-description"]')?.className).toContain('truncate');
    const meta = row.querySelector('[data-slot="list-meta"]') as HTMLElement;
    expect(meta.className).toContain('truncate');
    expect(meta.className).toContain('content-tertiary');
  });

  it('makes the whole row tappable at the min height, with hover and pressed states', () => {
    render(
      <List>
        <List.Group title="Roles">
          <List.Item href="/a" title="Staff engineer" />
        </List.Group>
      </List>,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('min-h-[var(--component-list-rowMinHeight)]');
    expect(link.className).toContain('p-[var(--component-list-rowPadding)]');
    expect(link.className).toContain('flex-1');
    expect(link.className).toMatch(/hover:bg-\[var\(--semantic-color-surface-hover\)\]/);
    expect(link.className).toMatch(/active:bg-\[var\(--semantic-color-surface-selected\)\]/);
  });

  it('draws inset dividers from the list, starting at the text column', () => {
    const { container } = render(
      <List>
        <List.Group title="Roles">
          <List.Item href="/a" title="With tile" leading={<List.Tile icon={Bell} />} />
          <List.Item href="/b" title="No tile" />
        </List.Group>
      </List>,
    );
    const ul = container.querySelector('ul') as HTMLElement;
    // The list draws the rule between rows; rows render no divider of their own.
    expect(ul.className).toContain('[&>li+li]:before:border-t');
    expect(ul.className).toContain('[&>li+li]:before:left-[var(--hds-local-list-text-start)]');
    expect(container.querySelectorAll('hr, [role="separator"]')).toHaveLength(0);
    const [withTile, noTile] = within(ul).getAllByRole('listitem');
    expect(withTile.getAttribute('data-leading')).toBe('true');
    expect(noTile.getAttribute('data-leading')).toBeNull();
    // The text column start: past the leading tile when there is one.
    expect(ul.className).toContain(
      '[&>li[data-leading]]:[--hds-local-list-text-start:calc(var(--component-list-rowPadding)*2+var(--component-list-leadingSize))]',
    );
    expect(ul.className).toContain(
      '[--hds-local-list-text-start:var(--component-list-rowPadding)]',
    );
  });

  it('renders exactly one trailing affordance: chevron, count or icon button', () => {
    const { rerender } = render(
      <List>
        <List.Group title="Roles">
          <List.Item href="/a" title="A" trailing="chevron" />
        </List.Group>
      </List>,
    );
    const trailing = () => Array.from(document.querySelectorAll('[data-slot="list-trailing"]'));
    expect(trailing()).toHaveLength(1);
    expect(trailing()[0].querySelectorAll('svg')).toHaveLength(1);

    rerender(
      <List>
        <List.Group title="Roles">
          <List.Item href="/a" title="A" trailing={12} />
        </List.Group>
      </List>,
    );
    expect(trailing()).toHaveLength(1);
    expect(trailing()[0].textContent).toBe('12');

    rerender(
      <List>
        <List.Group title="Roles">
          <List.Item
            href="/a"
            title="A"
            trailing={
              <Button variant="tertiary" iconOnly label="Star A" iconLeft={<Icon icon={Star} />} />
            }
          />
        </List.Group>
      </List>,
    );
    expect(trailing()).toHaveLength(1);
    expect(screen.getByRole('link').contains(screen.getByRole('button', { name: 'Star A' }))).toBe(
      false,
    );
  });

  it('lets an overflow menu replace the trailing slot, never sit beside it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <List>
        <List.Group title="Roles">
          <List.Item
            href="/a"
            title="A"
            // @ts-expect-error trailing and actions are exclusive
            trailing="chevron"
            actions={<Menu.Item>Archive</Menu.Item>}
          />
        </List.Group>
      </List>,
    );
    expect(document.querySelectorAll('[data-slot="list-trailing"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'More actions for A' })).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('inset (default) wraps rows in a raised rounded surface; plain renders a bare feed', () => {
    const { container, rerender } = render(
      <List>
        <List.Group title="Roles">
          <List.Item href="/a" title="A" />
        </List.Group>
      </List>,
    );
    let ul = container.querySelector('ul') as HTMLElement;
    expect(container.firstElementChild?.getAttribute('data-variant')).toBe('inset');
    expect(ul.className).toContain('rounded-lg');
    expect(ul.className).toContain('shadow-[var(--semantic-elevation-raised-shadow)]');

    rerender(
      <List variant="plain">
        <List.Group title="Roles">
          <List.Item href="/a" title="A" />
        </List.Group>
      </List>,
    );
    ul = container.querySelector('ul') as HTMLElement;
    expect(container.firstElementChild?.getAttribute('data-variant')).toBe('plain');
    expect(ul.getAttribute('data-hds-surface')).toBeNull();
    expect(ul.className).not.toContain('rounded-lg');
    expect(ul.className).toContain('[&>li+li]:before:border-t');
  });

  it('spaces groups and headings with the component.list rhythm tokens', () => {
    const { container } = render(
      <List>
        <List.Group title="A">
          <List.Item href="/a" title="A" />
        </List.Group>
      </List>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain(
      'gap-[var(--component-list-groupGap)]',
    );
    expect(container.querySelector('section')?.className).toContain(
      'gap-[var(--component-list-headingGap)]',
    );
  });

  it('List.Empty renders an EmptyState row inside the group', () => {
    render(
      <List>
        <List.Group title="Saved roles" count={0}>
          <List.Empty title="No saved roles yet" description="Save a role to see it here." />
        </List.Group>
      </List>,
    );
    const row = screen.getByRole('listitem');
    expect(row.textContent).toContain('No saved roles yet');
    expect(within(row).queryByRole('link')).toBeNull();
  });

  describe('entity rows', () => {
    const status = { value: 'open', label: 'Open' };

    it('puts the status in a slot inside the meta line by default', () => {
      render(
        <List>
          <List.Group title="Roles">
            <List.Item href="/a" title="A" meta="2 days ago" status={status} />
          </List.Group>
        </List>,
      );
      const meta = document.querySelector('[data-slot="list-meta"]') as HTMLElement;
      const slot = meta.querySelector('[data-slot="list-status"]') as HTMLElement;
      expect(slot.textContent).toBe('Open');
      expect(slot.className).toContain('truncate');
    });

    it('puts the status in trailing with statusIn="trailing", before the one affordance', () => {
      render(
        <List>
          <List.Group title="Roles">
            <List.Item href="/a" title="A" status={status} statusIn="trailing" trailing="chevron" />
          </List.Group>
        </List>,
      );
      expect(document.querySelector('[data-slot="list-meta"]')).toBeNull();
      const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-slot^="list-"]')).map(
        (el) => el.dataset.slot,
      );
      expect(slots.slice(-2)).toEqual(['list-status', 'list-trailing']);
      expect(document.querySelectorAll('[data-slot="list-trailing"]')).toHaveLength(1);
    });

    it('hides the status that is the list default (defaultStatus)', () => {
      render(
        <List defaultStatus="open">
          <List.Group title="Roles">
            <List.Item href="/a" title="A" status={status} />
            <List.Item href="/b" title="B" status={{ value: 'closed', label: 'Closed' }} />
          </List.Group>
        </List>,
      );
      const shown = Array.from(document.querySelectorAll('[data-slot="list-status"]')).map(
        (el) => el.textContent,
      );
      expect(shown).toEqual(['Closed']);
    });

    it('divider="none" on plain renders no dividers and spaces the rows instead', () => {
      const { container } = render(
        <List variant="plain" divider="none">
          <List.Group title="Roles">
            <List.Item href="/a" title="A" />
            <List.Item href="/b" title="B" />
          </List.Group>
        </List>,
      );
      const ul = container.querySelector('ul') as HTMLElement;
      expect(ul.className).not.toContain('before:border-t');
      expect(ul.className).toContain('gap-scale-xs');
    });
  });
});
