import { test, expect } from '@playwright/test';

/**
 * /upgrade/?from=X&to=Y at 390 (hds#464): the combined steps render, and the
 * page never scrolls sideways on a phone.
 * Run: `pnpm docs:build && pnpm exec playwright test tests/visual/upgrade-range.spec.ts`.
 */
test.describe('upgrade range page at 390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('0.16.0 → 0.20.0 lists the codemods and fits the width', async ({ page }) => {
    await page.goto('/upgrade?from=0.16.0&to=0.20.0');
    await expect(page.getByRole('status')).toContainText('5 releases');
    await expect(page.getByRole('region', { name: 'Codemods' })).toContainText(
      'hds-patterns-subpath',
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
