/**
 * Every HDS link surface refuses a script-capable href (hds#1145). React 18
 * only warns on a javascript: URL and still renders it, so an href built from
 * untrusted data (CMS content, a query string) would run script on click.
 */
import { forwardRef } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsRouterProvider, useHdsRouter, type HdsLinkComponent } from '../context/RouterContext';
import { BLOCKED_HREF } from '../../lib/safe-href';
import { InlineLink } from './inline-link';
import { Breadcrumb } from './breadcrumb';
import { NavList } from './nav-list';
import { List } from './list';

afterEach(cleanup);

const EVIL = 'javascript:alert(1)';
const hrefOf = (name: string) => screen.getByRole('link', { name }).getAttribute('href');

describe('link href safety (hds#1145)', () => {
  it('InlineLink blocks a javascript: href', () => {
    render(<InlineLink href={EVIL}>Click</InlineLink>);
    expect(hrefOf('Click')).toBe(BLOCKED_HREF);
  });

  it('InlineLink blocks an obfuscated scheme', () => {
    render(<InlineLink href={' java\tscript:alert(1)'}>Click</InlineLink>);
    expect(hrefOf('Click')).toBe(BLOCKED_HREF);
  });

  it('InlineLink keeps a mailto: href', () => {
    render(<InlineLink href="mailto:hi@example.com">Mail</InlineLink>);
    expect(hrefOf('Mail')).toBe('mailto:hi@example.com');
  });

  it('Breadcrumb blocks a javascript: crumb', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Evil', href: EVIL },
          { label: 'Here', href: '/here' },
        ]}
      />,
    );
    expect(hrefOf('Evil')).toBe(BLOCKED_HREF);
  });

  it('NavList.Item blocks a javascript: href', () => {
    render(
      <NavList>
        <NavList.Item href={EVIL}>Evil</NavList.Item>
      </NavList>,
    );
    expect(hrefOf('Evil')).toBe(BLOCKED_HREF);
  });

  it('List.Item blocks a javascript: href', () => {
    render(
      <List>
        <List.Group title="Group">
          <List.Item href={EVIL} title="Evil" />
        </List.Group>
      </List>,
    );
    expect(screen.getByRole('link').getAttribute('href')).toBe(BLOCKED_HREF);
  });

  it('a host LinkComponent never receives the unsafe value', () => {
    const seen: string[] = [];
    const Link: HdsLinkComponent = forwardRef(function TestLink({ to, children, ...rest }, ref) {
      seen.push(to);
      return (
        <a ref={ref} href={to} {...rest}>
          {children}
        </a>
      );
    });
    render(
      <HdsRouterProvider adapter={{ navigate: vi.fn(), currentPath: '/', LinkComponent: Link }}>
        <NavList>
          <NavList.Item href={EVIL}>Evil</NavList.Item>
        </NavList>
      </HdsRouterProvider>,
    );
    expect(seen).toEqual([BLOCKED_HREF]);
  });

  it('the router-free navigate refuses a javascript: href', () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, assign, pathname: '/' },
    });
    try {
      let nav: ((href: string) => void) | undefined;
      function Probe() {
        nav = useHdsRouter().navigate;
        return null;
      }
      render(<Probe />);
      nav?.(EVIL);
      nav?.('/ok');
      expect(assign.mock.calls).toEqual([['/ok']]);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });
});
