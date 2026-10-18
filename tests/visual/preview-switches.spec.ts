import { test, expect } from '@playwright/test';

/**
 * hds#794: the docs-only Corners + Shadow preview switches. Needs
 * `pnpm docs:publish` first (serves docs-site/out). Not a Chromatic snapshot.
 */
const BUTTON = '/docs/components/button';

test.describe('docs preview switches', () => {
  test('sharp + hard renders a button with radius 0 and the offset shadow', async ({ page }) => {
    await page.goto(BUTTON);
    await page.click('[data-docs-switch="corners-sharp"]');
    await page.click('[data-docs-switch="shadow-hard"]');
    const btn = page.locator('main button[data-variant="primary"]').first();
    await expect(btn).toBeVisible();
    const css = await btn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { radius: s.borderTopLeftRadius, shadow: s.boxShadow };
    });
    expect(css.radius).toBe('0px');
    expect(css.shadow).toMatch(/3px 3px 0px/);
  });

  test('choice persists across reloads', async ({ page }) => {
    await page.goto(BUTTON);
    await page.click('[data-docs-switch="corners-sharp"]');
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
    await page.click('[data-docs-switch="corners-sharp"]');
    await page.click('[data-docs-switch="shadow-hard"]');
    await page.waitForTimeout(300);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.01);
  });
});
