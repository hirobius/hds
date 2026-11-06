/**
 * hds#751 (components: indicator): the Progress fill and the active Tabs
 * indicator move on the productive motion token, never a raw duration or
 * Tailwind's untimed 150ms default. theme.css zeroes the productive duration
 * under prefers-reduced-motion, so reduced motion shows no movement.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Progress } from './progress';
import { Tabs, TabsList, TabsTrigger } from './tabs';

afterEach(cleanup);

const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');
const TOKEN_DURATION = 'duration-[var(--hds-motion-productive-duration)]';
const TOKEN_EASING = 'ease-[var(--hds-motion-productive-easing)]';

describe('indicator motion (hds#751)', () => {
  it('times the Progress fill on the productive token, never a raw value', () => {
    render(<Progress value={40} />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    const cls = fill.className;
    expect(cls).toContain('transition-[width]');
    expect(cls).toContain(TOKEN_DURATION);
    expect(cls).toContain(TOKEN_EASING);
    expect(cls).not.toMatch(/(^|\s)duration-\d/);
    expect(cls).not.toMatch(/(^|\s)ease-(out|in|in-out|linear)(\s|$)/);
  });

  it('times the active Tabs indicator and colour on the productive token', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const cls = screen.getByRole('tab', { name: 'A' }).className;
    expect(cls).toContain('transition-[color,background-color,border-color]');
    expect(cls).toContain(TOKEN_DURATION);
    expect(cls).toContain(TOKEN_EASING);
    expect(cls).not.toMatch(/(^|\s)transition-colors(\s|$)/);
  });

  it('stops under prefers-reduced-motion: theme.css zeroes the productive duration', () => {
    const root = theme.match(/\(prefers-reduced-motion: reduce\) \{\s*:root \{[^}]*\}/);
    expect(root?.[0]).toContain('--hds-motion-productive-duration: 0s');
  });
});
