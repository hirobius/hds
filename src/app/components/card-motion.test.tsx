/**
 * hds#751 (components: card lift): the interactive Card's hover lift and the
 * Card.Progress fill move on the productive motion token, never a raw
 * duration or a bare `ease-out`. Both are CSS custom properties that
 * theme.css zeroes under prefers-reduced-motion; the old Card.Progress fill
 * read a JS number inline, which reduced motion could not reach.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Card } from './card';

afterEach(cleanup);

const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');

describe('Card motion (hds#751)', () => {
  it('times the interactive hover lift on the productive token', () => {
    render(
      <Card asChild>
        <a href="/x">Go</a>
      </Card>,
    );
    const cls = screen.getByRole('link', { name: 'Go' }).className;
    expect(cls).toContain('transition-[scale,box-shadow]');
    expect(cls).toContain('duration-[var(--hds-motion-productive-duration)]');
    expect(cls).toContain('ease-[var(--hds-motion-productive-easing)]');
    expect(cls).not.toMatch(/(^|\s)duration-\d/);
  });

  it('times the Card.Progress fill on the productive token CSS variables', () => {
    render(<Card.Progress value={5} max={10} />);
    const fill = screen.getByRole('progressbar').querySelector('[style*="scaleX"]') as HTMLElement;
    expect(fill.style.transition).toBe(
      'transform var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)',
    );
  });

  it('stops under prefers-reduced-motion: theme.css zeroes the productive duration', () => {
    const root = theme.match(/\(prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*\}/);
    expect(root?.[0]).toContain('--hds-motion-productive-duration: 0s');
  });
});
