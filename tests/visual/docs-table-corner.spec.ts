import { test, expect } from '@playwright/test';

/**
 * hds#1398: a prose table's rounded corners must not clip its outline. At 390px the spacing
 * page's density table scrolls inside its frame; the frame owns the 1px stroke and the radius,
 * and the table draws none. Plain @playwright/test plus one screenshot baseline per theme.
 * Needs `pnpm docs:build` first.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`prose table frame keeps its stroke at every corner (390px, ${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/docs/foundations/spacing');
    const frame = page.locator('.hds-docs-table').first();
    await expect(frame).toBeVisible();
    const s = await frame.evaluate((el) => {
      const f = getComputedStyle(el);
      const t = getComputedStyle(el.querySelector('table')!);
      return {
        frameWidth: f.borderTopWidth,
        frameRight: f.borderRightWidth,
        radius: f.borderTopRightRadius,
        tableBorder: t.borderRightWidth,
      };
    });
    expect(s.frameWidth).toBe('1px');
    expect(s.frameRight).toBe('1px');
    expect(parseFloat(s.radius)).toBeGreaterThan(0);
    expect(s.tableBorder).toBe('0px');
    await expect(frame).toHaveScreenshot(`docs-table-corner-390-${theme}.png`);
  });
}
