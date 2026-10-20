import { test, expect, type Page } from '@playwright/test';

/**
 * hds#768: local pixel baselines for the primary Button's states (rest, hover,
 * pressed) in light and dark, so a state that stops changing fails before push.
 * Text is made transparent so only the fill, border and shadow are compared:
 * glyph antialiasing differs between machines, the state colours do not.
 *
 * threshold 0 + maxDiffPixels 0: a 1/255 step in any channel fails. That is the
 * regression this exists for (Primary pressed sat 1/255 off hover in dark).
 * Baselines are Linux Chromium (the remote container and CI), one shared copy.
 *
 * Needs `pnpm docs:publish` first. Update after an intended change with
 *   pnpm test:visual-docs:update
 * and commit the changed PNGs in tests/visual/button-states.spec.ts-snapshots/.
 */
const BUTTON = '/docs/components/button';
type State = 'rest' | 'hover' | 'pressed';

async function open(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t: string) => {
    try {
      localStorage.setItem('theme', t);
    } catch {
      /* storage blocked: the attributes set below still apply */
    }
  }, theme);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
  await page.goto(BUTTON);
  await page.evaluate((t: string) => {
    const el = document.documentElement;
    el.setAttribute('data-theme', t);
    el.classList.toggle('dark', t === 'dark');
    el.classList.toggle('light', t === 'light');
  }, theme);
  await page.evaluate(() => document.fonts?.ready);
}

for (const theme of ['light', 'dark'] as const) {
  test(`primary button states (${theme})`, async ({ page }) => {
    await open(page, theme);
    const btn = page
      .locator('.hds-demo-frame button[data-variant="primary"]:not([disabled])')
      .first();
    await expect(btn).toBeVisible();
    await btn.scrollIntoViewIfNeeded();
    const box = (await btn.boundingBox())!;
    const shot = (state: State) =>
      expect(btn).toHaveScreenshot(`button-primary-${state}-${theme}.png`, {
        animations: 'disabled',
        caret: 'hide',
        threshold: 0,
        maxDiffPixels: 0,
        stylePath: new URL('./button-states.css', import.meta.url).pathname,
      });

    await page.mouse.move(0, 0);
    await shot('rest');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await shot('hover');
    await page.mouse.down();
    await shot('pressed');
    await page.mouse.up();
  });
}
