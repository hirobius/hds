/**
 * hds#751 (components: indicator / nudge): an external InlineLink's arrow icon
 * nudges up and to the right on hover and keyboard focus, saying "this leaves
 * the page" as a response rather than a static glyph. The nudge is a CSS
 * transition on the productive motion token, whose duration theme.css zeroes
 * under prefers-reduced-motion, so reduced motion shows no movement. The file
 * carries no motion-ok exemption.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InlineLink } from './inline-link';

afterEach(cleanup);

const src = readFileSync(join(__dirname, 'inline-link.tsx'), 'utf8');
const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');

const externalIcon = () => {
  const link = screen.getByRole('link');
  return { link, icon: link.querySelector('svg') as SVGElement };
};

describe('InlineLink external icon nudge (hds#751)', () => {
  it('carries no motion-ok exemption', () => {
    expect(src).not.toMatch(/^\s*\/\/\s*motion-ok:/m);
  });

  it('nudges the external icon up-right on link hover and focus, scaled in em', () => {
    render(<InlineLink href="https://example.com">Docs</InlineLink>);
    const { link, icon } = externalIcon();
    expect(link.className).toMatch(/(^|\s)group(\s|$)/);
    const cls = icon.getAttribute('class') ?? '';
    for (const state of ['group-hover', 'group-focus-visible']) {
      expect(cls).toContain(`${state}:translate-x-[0.125em]`);
      expect(cls).toContain(`${state}:-translate-y-[0.125em]`);
    }
  });

  it('times the nudge on the productive motion token, never a raw value', () => {
    render(<InlineLink href="https://example.com">Docs</InlineLink>);
    const cls = externalIcon().icon.getAttribute('class') ?? '';
    expect(cls).toContain('transition-[translate]');
    expect(cls).toContain('duration-[var(--hds-motion-productive-duration)]');
    expect(cls).toContain('ease-[var(--hds-motion-productive-easing)]');
  });

  it('stops under prefers-reduced-motion: theme.css zeroes the productive duration', () => {
    const root = theme.match(/@media \(prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*\}/);
    expect(root?.[0]).toContain('--hds-motion-productive-duration: 0s');
  });

  it('leaves internal and plain links without an icon or nudge', () => {
    render(<InlineLink href="/docs">Docs</InlineLink>);
    expect(screen.getByRole('link').querySelector('svg')).toBeNull();
  });
});
