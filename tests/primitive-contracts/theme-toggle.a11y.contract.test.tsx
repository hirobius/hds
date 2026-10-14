/**
 * Contract test: ThemeToggle accessibility rules (hds#726). Each `it` title carries the
 * `a11y:<id>` the ThemeToggle `@a11y component` tags point at. CSS-backed rules (focus ring,
 * target size, reduced motion) read the shipped src/styles/theme.css, the file consumers get.
 *
 * @primitive ThemeToggle
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { user } from './overlay-fixtures';

afterEach(cleanup);

const raw = readFileSync(resolve(__dirname, '../../src/styles/theme.css'), 'utf8');

/** Every `@media (prefers-reduced-motion: reduce) { ... }` body, found by balancing braces. */
function reducedMotionBlocks(src: string): string[] {
  const out: string[] = [];
  const head = '@media (prefers-reduced-motion: reduce)';
  let at = src.indexOf(head);
  while (at !== -1) {
    const open = src.indexOf('{', at);
    let depth = 1;
    let i = open + 1;
    while (depth > 0 && i < src.length)
      ((depth += src[i] === '{' ? 1 : src[i] === '}' ? -1 : 0), i++);
    out.push(src.slice(open + 1, i - 1));
    at = src.indexOf(head, i);
  }
  return out;
}

const reduced = reducedMotionBlocks(raw);
// The base styles are everything outside the reduced-motion blocks.
const css = reduced.reduce((acc, body) => acc.replace(body, ''), raw);

/** Declarations of every top-level rule whose selector list mentions `needle`. */
function rulesFor(needle: string): string {
  const out: string[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of css.matchAll(re)) if (m[1].includes(needle)) out.push(m[2]);
  return out.join('\n');
}

describe('ThemeToggle accessibility contract', () => {
  it('a11y:theme-toggle.name - the accessible name says what happens next, and the state is not repeated as aria-pressed', () => {
    const { rerender } = render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    const button = screen.getByRole('button', { name: 'Switch to dark theme' });
    expect(button.hasAttribute('aria-pressed')).toBe(false);
    rerender(<ThemeToggle isDark onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBe(button);
  });

  it('a11y:theme-toggle.keyboard-activate - Tab reaches it and Enter and Space both switch the theme', async () => {
    const u = user();
    let flips = 0;
    render(<ThemeToggle isDark={false} onToggle={() => (flips += 1)} />);
    await u.tab();
    expect(document.activeElement).toBe(screen.getByRole('button'));
    await u.keyboard('{Enter}');
    await u.keyboard(' ');
    expect(flips).toBe(2);
  });

  it('a11y:theme-toggle.icon-hidden - the sun and moon svg is hidden from assistive technology and takes no focus', () => {
    render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
  });

  it('a11y:theme-toggle.focus-ring - keyboard focus draws the hds-focus ring and the control never removes its outline', () => {
    render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.className.split(/\s+/)).toContain('hds-focus');
    expect(rulesFor('.hds-focus:focus-visible')).toMatch(
      /outline:\s*var\(--hds-borderWidth-thick\)/,
    );
    expect(rulesFor('.hds-theme-toggle')).not.toMatch(/outline:\s*(none|0)/);
  });

  it('a11y:theme-toggle.target-size - the touch target is at least 44px square', () => {
    render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    expect(screen.getByRole('button').className.split(/\s+/)).toContain('hds-theme-toggle');
    const decl = rulesFor('.hds-theme-toggle');
    for (const prop of ['inline-size', 'block-size']) {
      const m = decl.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([\\d.]+)rem`));
      expect(m, `${prop} in rem`).not.toBeNull();
      expect(Number(m![1]) * 16, prop).toBeGreaterThanOrEqual(44);
    }
  });

  it('a11y:theme-toggle.reduced-motion - the morph moves only on motion tokens and stops under prefers-reduced-motion', () => {
    const motion = rulesFor('.hds-theme-toggle');
    const transitions = [...motion.matchAll(/transition:[^;]+;/g)].map((m) => m[0]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) {
      expect(t, t).toMatch(/var\(--primitive-duration-/);
      expect(t, t).not.toMatch(/\d+m?s\b(?![^()]*\))/); // no literal duration outside var()
    }
    const stop = reduced.find((body) => body.includes('.hds-theme-toggle')) ?? '';
    expect(stop).toMatch(/transition:\s*none/);
  });
});
