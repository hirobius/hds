/**
 * Tests for NavList — a list of links with one marked current. Plain-DOM
 * assertions; links go through the router seam (anchors by default).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { HdsRouterProvider, type HdsLinkComponent } from '../context/RouterContext';
import { NavList, NavListItem } from './nav-list';

afterEach(cleanup);

describe('NavList', () => {
  it('renders a list of links with their hrefs', () => {
    render(
      <NavList>
        <NavList.Item href="/a">Alpha</NavList.Item>
        <NavList.Item href="/b">Beta</NavList.Item>
      </NavList>,
    );
    expect(screen.getByRole('list').tagName).toBe('UL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/a', '/b']);
  });

  it('marks only the current item with aria-current=page', () => {
    render(
      <NavList>
        <NavList.Item href="/a">Alpha</NavList.Item>
        <NavList.Item href="/b" current>
          Beta
        </NavList.Item>
      </NavList>,
    );
    expect(screen.getByRole('link', { name: 'Beta' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Alpha' }).hasAttribute('aria-current')).toBe(false);
  });

  it('passes aria-label through on the list and on an item', () => {
    render(
      <NavList aria-label="Saved jobs">
        <NavList.Item href="/a" aria-label="Alpha, applied">
          Alpha
        </NavList.Item>
      </NavList>,
    );
    expect(screen.getByRole('list', { name: 'Saved jobs' })).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Alpha, applied' })).not.toBeNull();
  });

  it('holds rich children in a row', () => {
    render(
      <NavList>
        <NavList.Item href="/a">
          <span>Title line</span>
          <span>Meta line</span>
        </NavList.Item>
      </NavList>,
    );
    expect(screen.getByRole('link').textContent).toBe('Title lineMeta line');
  });

  it('exports NavListItem as the same part as NavList.Item', () => {
    expect(NavList.Item).toBe(NavListItem);
  });

  it('is reachable by keyboard and shows the focus ring', async () => {
    const user = userEvent.setup();
    render(
      <NavList>
        <NavList.Item href="/a">Alpha</NavList.Item>
        <NavList.Item href="/b">Beta</NavList.Item>
      </NavList>,
    );
    await user.tab();
    expect(document.activeElement?.textContent).toBe('Alpha');
    expect(document.activeElement?.className).toContain('hds-focus');
    await user.tab();
    expect(document.activeElement?.textContent).toBe('Beta');
  });

  it('routes items through the router adapter link component', () => {
    const Link: HdsLinkComponent = forwardRef(function TestLink({ to, children, ...rest }, ref) {
      return (
        <a ref={ref} href={to} data-routed="yes" className="hds-focus" {...rest}>
          {children}
        </a>
      );
    });
    const navigate = vi.fn();
    render(
      <HdsRouterProvider adapter={{ navigate, currentPath: '/', LinkComponent: Link }}>
        <NavList>
          <NavList.Item href="/a">Alpha</NavList.Item>
        </NavList>
      </HdsRouterProvider>,
    );
    const link = screen.getByRole('link', { name: 'Alpha' });
    expect(link.getAttribute('data-routed')).toBe('yes');
    expect(link.getAttribute('href')).toBe('/a');
  });

  describe('select mode (onSelect)', () => {
    it('renders a button, not a link, and calls onSelect on click', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <NavList>
          <NavList.Item onSelect={onSelect}>Alpha</NavList.Item>
        </NavList>,
      );
      expect(screen.queryByRole('link')).toBeNull();
      const button = screen.getByRole('button', { name: 'Alpha' });
      expect(button.getAttribute('type')).toBe('button');
      await user.click(button);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('marks only the selected item with aria-current=true', () => {
      render(
        <NavList>
          <NavList.Item onSelect={() => {}}>Alpha</NavList.Item>
          <NavList.Item onSelect={() => {}} selected>
            Beta
          </NavList.Item>
        </NavList>,
      );
      expect(screen.getByRole('button', { name: 'Beta' }).getAttribute('aria-current')).toBe(
        'true',
      );
      expect(screen.getByRole('button', { name: 'Alpha' }).hasAttribute('aria-current')).toBe(
        false,
      );
    });

    it('uses the selected fill on the selected row and the hover fill on the rest', () => {
      render(
        <NavList>
          <NavList.Item onSelect={() => {}}>Alpha</NavList.Item>
          <NavList.Item onSelect={() => {}} selected>
            Beta
          </NavList.Item>
        </NavList>,
      );
      expect(screen.getByRole('button', { name: 'Beta' }).className).toContain('surface-selected');
      expect(screen.getByRole('button', { name: 'Alpha' }).className).toContain('surface-hover');
    });

    it('selects with Tab, Enter and Space', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <NavList>
          <NavList.Item onSelect={() => onSelect('a')}>Alpha</NavList.Item>
          <NavList.Item onSelect={() => onSelect('b')}>Beta</NavList.Item>
        </NavList>,
      );
      await user.tab();
      expect(document.activeElement?.textContent).toBe('Alpha');
      expect(document.activeElement?.className).toContain('hds-focus');
      await user.keyboard('{Enter}');
      await user.tab();
      await user.keyboard(' ');
      expect(onSelect.mock.calls).toEqual([['a'], ['b']]);
    });

    it('holds rich children', () => {
      render(
        <NavList>
          <NavList.Item onSelect={() => {}}>
            <span>Title line</span>
            <span>Meta line</span>
          </NavList.Item>
        </NavList>,
      );
      expect(screen.getByRole('button').textContent).toBe('Title lineMeta line');
    });

    it('rejects href together with onSelect at the type level', () => {
      // @ts-expect-error href and onSelect are exclusive
      const bad = <NavList.Item href="/a" onSelect={() => {}} />;
      expect(bad).toBeTruthy();
    });
  });
});
