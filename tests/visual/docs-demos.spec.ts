import { test, expect } from '@chromatic-com/playwright';
// @ts-expect-error -- plain ESM helper shared with the axe gate; no type declarations.
import { DEMO_SELECTOR, discoverPages } from '../../scripts/lib/docs-axe.mjs';
import { openThemed } from './theme';

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
        await openThemed(page, route, theme);
        const demo = page.locator(DEMO_SELECTOR).first();
        await expect(demo).toBeVisible();
      });
    }
  }
});
