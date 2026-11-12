import { test, expect, type Locator, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { openThemed } from './theme';

/**
 * hds#1510: the label in Badge, Tag and the count badge must sit in the vertical middle of
 * its pill, not ~1px high. The check measures ink, not CSS: the label is set to a cap-only
 * word ("HEX": flat top and bottom, no descender, no overshoot) or digits for a count, the
 * pill is shot with and without the label colour, and the rows that differ are the glyph
 * ink. The offset is the ink's vertical centre minus the pill's (negative = high), in CSS
 * px, at 1x and 3x so a sub-pixel drift shows. The bound is 0.5px.
 * Needs `pnpm docs:publish` first.
 */
const MAX_OFFSET = 0.5;

function inkOffset(withText: Buffer, withoutText: Buffer, scale: number) {
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
  return (top + bottom + 1) / 2 / scale - a.height / scale / 2;
}

async function measure(page: Page, pill: Locator, text: string, scale: number) {
  await pill.scrollIntoViewIfNeeded();
  // Set the text on the label wrapper when the pill has one (Badge), else on the pill (Tag).
  await pill.evaluate((el, t) => {
    (el.querySelector(':scope > span') ?? el).textContent = t;
  }, text);
  await page.mouse.move(0, 0);
  const withText = await pill.screenshot({ animations: 'disabled' });
  await pill.evaluate((el) => (el.style.color = 'transparent'));
  const withoutText = await pill.screenshot({ animations: 'disabled' });
  await pill.evaluate((el) => (el.style.color = ''));
  return inkOffset(withText, withoutText, scale);
}

const CASES = [
  {
    name: 'Badge',
    route: '/docs/components/badge',
    text: 'HEX',
    pill: (page: Page) => page.locator('main span[data-tone="neutral"]').first(),
  },
  {
    // The count badge is a Badge with tabular numerals; reuse a demo Badge and add the class.
    name: 'Count',
    route: '/docs/components/badge',
    text: '128',
    pill: async (page: Page) => {
      const el = page.locator('main span[data-tone="neutral"]').first();
      await el.evaluate((n) => n.classList.add('tabular-nums'));
      return el;
    },
  },
  {
    name: 'Tag',
    route: '/docs/components/tag',
    text: 'HEX',
    pill: (page: Page) => page.locator('main button[aria-pressed="false"] > span').first(),
  },
];

for (const scale of [1, 3]) {
  test.describe(`${scale}x`, () => {
    test.use({ deviceScaleFactor: scale, viewport: { width: 1280, height: 900 } });
    for (const theme of ['light', 'dark'] as const) {
      for (const c of CASES) {
        test(`${c.name} label is vertically centred (${theme})`, async ({ page }) => {
          await openThemed(page, c.route, theme);
          const pill = await c.pill(page);
          await expect(pill).toBeVisible();
          const offset = await measure(page, pill, c.text, scale);
          console.log(`vcenter ${c.name} ${scale}x ${theme}: ${offset.toFixed(3)}px`);
          expect(Math.abs(offset)).toBeLessThanOrEqual(MAX_OFFSET);
        });
      }
    }
  });
}
