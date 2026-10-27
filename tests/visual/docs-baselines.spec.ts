import { test, expect } from '@playwright/test';
// @ts-expect-error -- plain ESM helper shared with the axe gate; no type declarations.
import { DEMO_SELECTOR, discoverPages } from '../../scripts/lib/docs-axe.mjs';
import { DEMO_SHOT, openThemed } from './theme';

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
 * Tagged @baseline: `pnpm test:visual-baselines` runs these and button-states;
 * `pnpm test:visual-docs` (the Chromatic capture) skips them. Needs
 * `pnpm docs:publish` first. After an intended change, run
 * `pnpm test:visual-baselines:update` and commit the PNGs.
 * A demo with no baseline yet fails until the update run writes one.
 */
const pages: string[] = discoverPages('docs-site/out');

test.describe('docs demo baselines @baseline', () => {
  test('docs-site/out has component and pattern pages', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const route of pages) {
    const name = route.replace(/^\/docs\//, '').replace(/\//g, '-');
    for (const theme of ['light', 'dark'] as const) {
      test(`${route} (${theme})`, async ({ page }) => {
        await openThemed(page, route, theme);
        const demo = page.locator(DEMO_SELECTOR).first();
        await expect(demo).toBeVisible();
        await page.mouse.move(0, 0);
        await expect(demo).toHaveScreenshot(`${name}-${theme}.png`, DEMO_SHOT);
      });
    }
  }
});
