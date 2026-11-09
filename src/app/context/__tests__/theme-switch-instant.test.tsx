/**
 * hds#1399: a theme switch is instant. ThemeProvider suspends transitions for one frame
 * (data-hds-theme-switching on <html>) while it flips data-theme, then resumes them.
 */
import { readFileSync } from 'node:fs';
import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext';

const ref: { api?: ReturnType<typeof useTheme> } = {};
function Probe() {
  const api = useTheme();
  useEffect(() => {
    ref.api = api;
  });
  return null;
}

describe('instant theme switch (hds#1399)', () => {
  it('suspends transitions through one painted frame while data-theme flips', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    for (let i = 0; i < 2; i += 1) frames.splice(0).forEach((cb) => cb(0)); // settle the mount
    const root = document.documentElement;
    const before = root.getAttribute('data-theme');
    act(() => ref.api?.toggleDark());
    expect(root.getAttribute('data-theme')).not.toBe(before);
    expect(root.hasAttribute('data-hds-theme-switching')).toBe(true);
    frames.splice(0).forEach((cb) => cb(0)); // first frame paints with transitions off
    expect(root.hasAttribute('data-hds-theme-switching')).toBe(true);
    frames.splice(0).forEach((cb) => cb(0)); // second frame resumes them
    expect(root.hasAttribute('data-hds-theme-switching')).toBe(false);
    vi.unstubAllGlobals();
  });

  it('theme.css turns every transition off during the switch', () => {
    const css = readFileSync('src/styles/theme.css', 'utf8');
    expect(css).toMatch(/:root\[data-hds-theme-switching\] \*[\s\S]*?transition: none !important/);
  });

  it('the transition tokens alias the productive motion (150ms decelerate)', () => {
    const t = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8')).semantic.motion;
    for (const k of ['transitionColor', 'transitionShadow']) {
      expect(t[k].$value.duration).toBe(t.productive.$value.duration);
      expect(t[k].$value.timingFunction).toBe(t.productive.$value.timingFunction);
    }
  });
});
