/**
 * Tests for InlineLink — internal vs external vs plain (mailto/tel/hash) hrefs.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { InlineLink } from './inline-link';

afterEach(cleanup);

const link = (name: string) => screen.getByRole('link', { name: new RegExp(name) });
const hasIcon = (el: HTMLElement) => el.querySelector('svg') !== null;

describe('InlineLink', () => {
  it('routes a single-slash path through the router link with the focus ring', () => {
    render(<InlineLink href="/docs/tokens">Tokens</InlineLink>);
    const a = link('Tokens');
    expect(a.getAttribute('href')).toBe('/docs/tokens');
    expect(a.getAttribute('target')).toBeNull();
    expect(a.className).toContain('hds-focus');
    expect(a.className).toContain('hds-link');
    expect(hasIcon(a)).toBe(false);
  });

  it('treats a protocol-relative //host URL as external, not a router path', () => {
    render(<InlineLink href="//cdn.example.com/x">CDN</InlineLink>);
    const a = link('CDN');
    expect(a.getAttribute('href')).toBe('//cdn.example.com/x');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(hasIcon(a)).toBe(true);
  });

  it('opens http(s) in a new tab with an icon and a visually-hidden announcement', () => {
    render(<InlineLink href="https://example.com">Example</InlineLink>);
    const a = link('Example');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(hasIcon(a)).toBe(true);
    const hidden = a.querySelector('.sr-only');
    expect(hidden?.textContent).toContain('opens in new tab');
    expect(a.className).toContain('hds-focus');
  });

  it('announces new-tab even when the icon is turned off', () => {
    render(
      <InlineLink href="https://example.com" externalIcon={false}>
        Example
      </InlineLink>,
    );
    const a = link('Example');
    expect(hasIcon(a)).toBe(false);
    expect(a.querySelector('.sr-only')?.textContent).toContain('opens in new tab');
  });

  it.each([
    ['mailto:hi@example.com', 'Mail'],
    ['tel:+15551234567', 'Call'],
    ['#section-2', 'Jump'],
  ])('keeps %s a plain same-tab link with no external icon', (href, text) => {
    render(<InlineLink href={href}>{text}</InlineLink>);
    const a = link(text);
    expect(a.getAttribute('href')).toBe(href);
    expect(a.getAttribute('target')).toBeNull();
    expect(a.getAttribute('rel')).toBeNull();
    expect(hasIcon(a)).toBe(false);
    expect(a.querySelector('.sr-only')).toBeNull();
    expect(a.className).toContain('hds-focus');
    expect(a.className).toContain('hds-link');
  });
});
