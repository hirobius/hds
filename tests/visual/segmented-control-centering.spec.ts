import { test, expect, type Locator, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { DEMO_SHOT, openThemed } from './theme';

/**
 * hds#1461: the SegmentedControl label must sit optically centred in its segment, in the sm
 * and md sizes, light and dark. Sora's content area is 1.26em tall with its cap midline
 * 0.025em above the box centre and its x-height midline 0.073em below it, so a label that
 * drifts even 1px (a padding, a line-height or a translate change) reads high or low.
 *
 * The check measures ink, not CSS: the label is set to "Find" (cap + ascender, no descender)
 * and "Apply" (descender) the way Roleflame's app bar spells them, the segment is shot with
 * and without the label colour, and the rows that differ are the glyph ink. Retina (2x) so a
 * half pixel shows. Current values (Find, Apply): sm -0.75, +0.75; md -0.25, +1.25 (Apply's descender pulls its
 * ink centre down). Each band is the current value +-0.75px, so a 1px shift either way fails.
 *
 * The @baseline test also compares the two labelled segments with a committed PNG.
 * Needs `pnpm docs:publish` first; refresh with `pnpm test:visual-baselines:update`.
 */
const ROUTE = '/docs/components/segmented-control';
const BANDS = {
  sm: { Find: [-1.5, 0], Apply: [0, 1.5] },
  md: { Find: [-1, 0.5], Apply: [0.5, 2] },
} as const;

test.use({ deviceScaleFactor: 2, viewport: { width: 1280, height: 900 } });

function inkCentre(withText: Buffer, withoutText: Buffer, scale: number) {
  const a = PNG.sync.read(withText);
  const b = PNG.sync.read(withoutText);
  let top = Infinity;
  let bottom = -1;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const k = (y * a.width + x) * 4;
      const d =
        Math.abs(a.data[k] - b.data[k]) +
        Math.abs(a.data[k + 1] - b.data[k + 1]) +
        Math.abs(a.data[k + 2] - b.data[k + 2]);
      if (d > 90) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return { top: top / scale, bottom: (bottom + 1) / scale, height: a.height / scale };
}

/** An unselected segment of the first demo, with its label replaced by `word`. */
async function segment(page: Page, size: 'sm' | 'md'): Promise<Locator> {
  const radios = page.locator('button[role="radio"][aria-checked="false"]');
  await expect(radios.first()).toBeVisible();
  const count = await radios.count();
  for (let i = 0; i < count; i++) {
    const r = radios.nth(i);
    const h = (await r.boundingBox())?.height ?? 0;
    // sm rail items are 22px, md 30-32px; the touch-target floor never changes the box.
    if ((size === 'sm') === h < 27) return r;
  }
  throw new Error(`no ${size} segment in the SegmentedControl demo`);
}

const label = (seg: Locator) => seg.locator('span:not([aria-hidden])').first();

for (const theme of ['light', 'dark'] as const) {
  for (const size of ['sm', 'md'] as const) {
    test(`label is optically centred, ${size} (${theme})`, async ({ page }) => {
      await openThemed(page, ROUTE, theme);
      const seg = await segment(page, size);
      await seg.scrollIntoViewIfNeeded();
      for (const word of ['Find', 'Apply'] as const) {
        await label(seg).evaluate((el, w) => (el.textContent = w), word);
        await page.mouse.move(0, 0);
        const withText = await seg.screenshot({ animations: 'disabled' });
        await label(seg).evaluate((el) => (el.style.color = 'transparent'));
        const withoutText = await seg.screenshot({ animations: 'disabled' });
        await label(seg).evaluate((el) => (el.style.color = ''));
        const ink = inkCentre(withText, withoutText, 2);
        const offset = (ink.top + ink.bottom) / 2 - ink.height / 2;
        const [lo, hi] = BANDS[size][word];
        expect(
          offset,
          `${word} ink centre is ${offset}px from the ${size} segment centre (want ${lo}..${hi})`,
        ).toBeGreaterThanOrEqual(lo);
        expect(offset).toBeLessThanOrEqual(hi);
      }
    });
  }

  test(`Find / Apply segments match the baseline (${theme}) @baseline`, async ({ page }) => {
    await openThemed(page, ROUTE, theme);
    for (const size of ['sm', 'md'] as const) {
      const seg = await segment(page, size);
      await seg.scrollIntoViewIfNeeded();
      await label(seg).evaluate((el, w) => (el.textContent = w), size === 'sm' ? 'Find' : 'Apply');
      await page.mouse.move(0, 0);
      await expect(seg).toHaveScreenshot(`segmented-control-label-${size}-${theme}.png`, {
        ...DEMO_SHOT,
        threshold: 0.05,
      });
    }
  });
}
