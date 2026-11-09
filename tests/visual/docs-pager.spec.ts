import { test, expect } from '@playwright/test';

/**
 * hds#1393 follow-up: the previous / next pager at the bottom of a docs page, light and dark,
 * at 390px (stacked) and 1280px (side by side). The screenshot baselines are tagged @baseline
 * (pnpm test:visual-baselines). Needs `pnpm docs:build` first.
 */
for (const theme of ['light', 'dark'] as const) {
  for (const width of [390, 1280] as const) {
    test(`docs pager baseline (${width}px, ${theme}) @baseline`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/docs/components/badge');
      const pager = page.locator('.hds-page-pager');
      await pager.scrollIntoViewIfNeeded();
      await expect(pager).toHaveScreenshot(`docs-pager-${width}-${theme}.png`);
    });
  }
}
