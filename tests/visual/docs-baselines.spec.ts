import { test, expect } from '@playwright/test';
// @ts-expect-error -- plain ESM helper shared with the axe gate; no type declarations.
import { DEMO_SELECTOR, discoverPages } from '../../scripts/lib/docs-axe.mjs';

/**
 * hirobius/ops#726: local visual suite. Every component and pattern demo of the
 * docs site, light and dark, compared against committed PNG baselines in
 * tests/visual/docs-baselines.spec.ts-snapshots/. Runs offline with no
 * Chromatic account, so a visual change shows up as a failing test before push.
 *
 * Baselines are Linux Chromium (the remote container), one shared copy. A small
 * tolerance absorbs edge antialiasing between Chromium revisions; a changed
 * colour, size or layout still fails. button-states.spec.ts stays the strict
 * zero-tolerance check for the primary Button's state fills.
 *
 * Needs `pnpm docs:publish` first. Run with `pnpm test:visual-baselines`; after
 * an intended change, `pnpm test:visual-baselines:update` and commit the PNGs.
 * A demo with no baseline yet fails until the update run writes one.
 */
const pages: string[] = discoverPages('docs-site/out');

test.describe('docs demo baselines', () => {
  test('docs-site/out has component and pattern pages', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const route of pages) {
    const name = route.replace(/^\/docs\//, '').replace(/\//g, '-');
    for (const theme of ['light', 'dark'] as const) {
      test(`${route} (${theme})`, async ({ page }) => {
        await page.addInitScript((t: string) => {
          try {
            localStorage.setItem('theme', t);
          } catch {
            /* storage blocked: the attributes set below still apply */
          }
        }, theme);
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
        await page.goto(route);
        await page.evaluate((t: string) => {
          const el = document.documentElement;
          el.setAttribute('data-theme', t);
          el.classList.toggle('dark', t === 'dark');
          el.classList.toggle('light', t === 'light');
        }, theme);
        const demo = page.locator(DEMO_SELECTOR).first();
        await expect(demo).toBeVisible();
        await page.evaluate(() => document.fonts?.ready);
        await page.mouse.move(0, 0);
        await expect(demo).toHaveScreenshot(`${name}-${theme}.png`, {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.002,
        });
      });
    }
  }
});
