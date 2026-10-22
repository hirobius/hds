import { test, expect } from '@playwright/test';

/**
 * hds#794: the docs-only Corners + Shadow preview switches. Needs
 * `pnpm docs:publish` first (serves docs-site/out). Not a Chromatic snapshot.
 */
const BUTTON = '/docs/components/button';

/** The controls live in a Popover opened by the display-settings button beside the theme switch. */
async function choose(page: import('@playwright/test').Page, option: string) {
  await page.locator('[data-docs-switch-trigger]:visible').first().click();
  await page.getByRole('radio', { name: option }).click();
  await page.keyboard.press('Escape');
}

test.describe('docs preview switches', () => {
  test('sharp + hard renders a button with radius 0 and the offset shadow', async ({ page }) => {
    await page.goto(BUTTON);
    await choose(page, 'Sharp');
    await choose(page, 'Hard');
    const btn = page.locator('main button[data-variant="primary"]').first();
    await expect(btn).toBeVisible();
    const css = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { radius: s.borderTopLeftRadius, shadow: s.boxShadow };
    });
    expect(css.radius).toBe('0px');
    expect(css.shadow).toMatch(/0px 3px 0px/);
  });

  test('choice persists across reloads', async ({ page }) => {
    await page.goto(BUTTON);
    await choose(page, 'Sharp');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-docs-corners', 'sharp');
  });

  test('switching causes no layout shift', async ({ page }) => {
    await page.goto(BUTTON);
    await page.evaluate(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[]) {
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: false });
    });
    await choose(page, 'Sharp');
    await choose(page, 'Hard');
    await page.waitForTimeout(300);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.01);
  });
});
