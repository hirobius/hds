import { test, expect } from '@chromatic-com/playwright';
// @ts-expect-error -- plain ESM helper shared with the axe gate; no type declarations.
import { DEMO_SELECTOR, discoverPages } from '../../scripts/lib/docs-axe.mjs';

/**
 * One snapshot per component/pattern demo of the docs site, light and dark.
 * Chromatic captures the page at the end of each test and diffs it against its
 * own baseline, so the spec asserts only that the demo rendered (no committed
 * pixel baselines). `pnpm test:visual-docs` runs it locally; the chromatic-docs job in
 * .github/workflows/chromatic.yml runs it with chromaui/action (playwright: true).
 * Needs `pnpm docs:publish` first.
 */
const pages: string[] = discoverPages('docs-site/out');

test.describe('docs site demos', () => {
  test('docs-site/out has component and pattern pages', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  for (const route of pages) {
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
      });
    }
  }
});
