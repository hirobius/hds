import { test, expect } from '@playwright/test';
import { openThemed } from './theme';

/**
 * hds#1506 follow-up: `openThemed` must hand back a settled page. The radio demo
 * ships its checked dot as SSR HTML at scale(0.4) / opacity 0; React hydrates, then
 * motion runs a WAAPI entrance animation. A screenshot taken before that finishes
 * catches the demo mid-entrance (dot hidden, or its layers still promoted, which
 * flips the label text between LCD and greyscale antialiasing: the 469-pixel
 * "heavier label" flake). Throttling the CPU widens the race so one run is enough
 * to see it, and the font checks pin that the faces were never the cause.
 * Tagged @baseline so it runs with the suite it protects, not the Chromatic capture.
 */
test.describe('openThemed settles the page @baseline', () => {
  test('radio demo is hydrated, motion-idle and on its final styles', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await openThemed(page, '/docs/components/radio', 'light');

    const state = await page.evaluate(() => {
      const frame = document.querySelector('.hds-demo-frame') as HTMLElement;
      const dot = [...frame.querySelectorAll('span')].find((s) => s.style.opacity === '0');
      const label = [...frame.querySelectorAll('label span')].find(
        (s) => s.textContent === 'Solo',
      )!;
      const cs = getComputedStyle(label);
      return {
        hydrated: [...frame.querySelectorAll('*')].some((e) =>
          Object.keys(e).some((k) => k.startsWith('__reactFiber$')),
        ),
        runningAnimations: document.getAnimations().length,
        hiddenInitialDot: Boolean(dot),
        weight: cs.fontWeight,
        faces: [...document.fonts]
          .filter((f) => f.family !== 'sans Fallback')
          .map((f) => `${f.family}:${f.status}`),
      };
    });

    expect(state.hydrated).toBe(true);
    expect(state.runningAnimations).toBe(0);
    expect(state.hiddenInitialDot).toBe(false);
    expect(state.weight).toBe('400');
    expect(state.faces.every((f) => f.endsWith(':loaded'))).toBe(true);
  });
});
