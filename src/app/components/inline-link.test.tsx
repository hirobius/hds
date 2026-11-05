/**
 * Tests for InlineLink — internal vs external vs plain (mailto/tel/hash) hrefs.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import tokens from '../../../hirobius.tokens.json';
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

  it('standalone opts a link out of running text into a 24px hit area; inline links stay as they are', () => {
    render(
      <>
        <InlineLink href="/companies" standalone>
          Back to companies
        </InlineLink>
        <InlineLink href="/docs">Docs</InlineLink>
      </>,
    );
    expect(link('Back to companies').className).toContain('hds-link-standalone');
    expect(link('Docs').className).not.toContain('hds-link-standalone');
  });

  describe('size and the external icon', () => {
    const icon = (el: HTMLElement) => el.querySelector('svg') as SVGSVGElement;
    const comp = tokens.component.inlineLink;
    const prim = tokens.primitive;
    const px = (ref: string): number => {
      // {primitive.typography.size.lg} / {primitive.size.12} -> px number
      const node = ref
        .slice(1, -1)
        .split('.')
        .reduce<unknown>((n, k) => (n as Record<string, unknown>)[k], tokens) as {
        $value: { value: number; unit: string };
      };
      expect(node.$value.unit).toBe('px');
      return node.$value.value;
    };

    it('sizes and spaces the icon in em, so it scales with the font size', () => {
      render(<InlineLink href="https://example.com">Example</InlineLink>);
      const svg = icon(link('Example'));
      expect(svg.style.width).toBe('var(--component-inlineLink-iconSize)');
      expect(svg.style.height).toBe('var(--component-inlineLink-iconSize)');
      expect(svg.style.marginLeft).toBe('var(--component-inlineLink-iconGap)');
      expect(svg.getAttribute('width')).not.toBe('11');
      expect(comp.iconSize.$value).toBe('{primitive.inlineIcon.size}');
      expect(comp.iconGap.$value).toBe('{primitive.inlineIcon.gap}');
      expect(prim.inlineIcon.size.$value).toEqual({ value: 0.75, unit: 'em' });
      expect(prim.inlineIcon.gap.$value).toEqual({ value: 0.25, unit: 'em' });
    });

    it('inherits the surrounding type when no size is set', () => {
      render(<InlineLink href="https://example.com">Example</InlineLink>);
      expect(link('Example').className).not.toMatch(/hds-type-/);
    });

    it.each([
      ['sm', 'ui', 'base'],
      ['md', 'body', 'lg'],
      ['lg', 'title', 'title'],
    ] as const)('size %s takes the %s role', (size, role, step) => {
      render(
        <InlineLink href="https://example.com" size={size}>
          Example
        </InlineLink>,
      );
      const a = link('Example');
      expect(a.className.split(' ')).toContain(`hds-type-${role}`);
      expect(a.className.match(/hds-type-/g)).toHaveLength(1);
      // Same font-size step as the role, so the Figma Size variant matches what code renders.
      const roleSize = (tokens.semantic.typography[role].$value as { fontSize: string }).fontSize;
      expect(roleSize).toBe(`{primitive.typography.size.${step}}`);
      expect(comp.size[size].fontSize.$value).toBe(roleSize);
      // Figma's px icon stays within 1.5px of the code's 0.75em at that size.
      const fontPx = px(comp.size[size].fontSize.$value);
      expect(Math.abs(px(comp.size[size].iconSize.$value) - fontPx * 0.75)).toBeLessThanOrEqual(
        1.5,
      );
    });

    it('applies the size to internal and plain links too', () => {
      render(
        <>
          <InlineLink href="/docs" size="lg">
            Docs
          </InlineLink>
          <InlineLink href="#top" size="sm">
            Top
          </InlineLink>
        </>,
      );
      expect(link('Docs').className).toContain('hds-type-title');
      expect(link('Top').className).toContain('hds-type-ui');
    });
  });
});
