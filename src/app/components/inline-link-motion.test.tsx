/**
 * hds#751 (components: indicator / nudge): an external InlineLink's arrow icon
 * nudges up and to the right on hover and keyboard focus, saying "this leaves
 * the page" as a response rather than a static glyph. The nudge is a CSS
 * transition on the productive motion token, whose duration theme.css zeroes
 * under prefers-reduced-motion, so reduced motion shows no movement. The file
 * carries no motion-ok exemption.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InlineLink } from './inline-link';

afterEach(cleanup);

const src = readFileSync(join(__dirname, 'inline-link.tsx'), 'utf8');

const externalIcon = () => {
  const link = screen.getByRole('link');
  return { link, icon: link.querySelector('svg') as SVGElement };
};

describe('InlineLink external icon nudge (hds#751)', () => {
  it('carries no motion-ok exemption', () => {
    expect(src).not.toMatch(/^\s*\/\/\s*motion-ok:/m);
  });

  it('marks the link as the nudge root and the icon as the nudged element', () => {
    render(<InlineLink href="https://example.com">Docs</InlineLink>);
    const { link, icon } = externalIcon();
    expect(link.className).toMatch(/(^|\s)hds-ext(\s|$)/);
    expect(icon.getAttribute('class') ?? '').toContain('hds-ext-icon');
  });

  it('leaves internal and plain links without an icon or nudge', () => {
    render(<InlineLink href="/docs">Docs</InlineLink>);
    expect(screen.getByRole('link').querySelector('svg')).toBeNull();
  });
});
