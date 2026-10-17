/**
 * Theme switches are instant (job-hunt feedback, 2026-10-17: "the theme switcher
 * is a pretty slow transition speed").
 *
 * A universal `transition: background-color 0.3s, color 0.3s, …` on every element
 * of the HDS subtree made each light/dark swap fade for 300ms, and the components'
 * own colour transitions (`transition-colors`, 150ms) faded too. Now there is no
 * universal colour transition, and a swap sets `data-theme-switching` on the theme
 * root for one frame, which turns every transition under it off.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const indexCss = readFileSync(resolve(__dirname, '../../../styles/index.css'), 'utf8');

describe('theme swap CSS', () => {
  it('has no universal colour transition on the HDS subtree', () => {
    expect(indexCss).not.toMatch(/\[data-hds\]\)\s*\*[\s\S]{0,120}transition:\s*background-color/);
  });

  it('turns every transition off under [data-theme-switching]', () => {
    const rule = indexCss.match(/\[data-theme-switching\][^{]*\{[^}]*\}/);
    expect(rule?.[0]).toMatch(/\*/);
    expect(rule?.[0]).toMatch(/transition:\s*none\s*!important/);
  });
});

describe('theme swap suppresses transitions for one frame', () => {
  let container: HTMLDivElement;
  let root: Root;
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-theme-switching');
  });

  function flushFrames() {
    // Two frames: the swap's style is committed, then the attribute comes off.
    for (let i = 0; i < 2; i++) frames.splice(0).forEach((cb) => cb(0));
  }

  it('ThemeProvider sets data-theme-switching on <html> during toggleDark, then clears it', async () => {
    const { ThemeProvider, useTheme } = await import('../ThemeContext');
    let toggle: (() => void) | undefined;
    function Probe() {
      toggle = useTheme().toggleDark;
      return null;
    }
    act(() => {
      root.render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
    flushFrames();
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(false);

    act(() => toggle!());
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(true);
    flushFrames();
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(false);
  });

  it('HdsThemeProvider sets data-theme-switching on its scope when theme changes, not on mount', async () => {
    const { HdsThemeProvider } = await import('../hds-theme');
    act(() => {
      root.render(<HdsThemeProvider theme="light">x</HdsThemeProvider>);
    });
    const scope = container.querySelector('[data-hds]')!;
    expect(scope.hasAttribute('data-theme-switching')).toBe(false);

    act(() => {
      root.render(<HdsThemeProvider theme="dark">x</HdsThemeProvider>);
    });
    expect(scope.getAttribute('data-theme')).toBe('dark');
    expect(scope.hasAttribute('data-theme-switching')).toBe(true);
    flushFrames();
    expect(scope.hasAttribute('data-theme-switching')).toBe(false);
  });
});
