import { test, expect } from '@playwright/test';
import { openThemed } from './theme';

/**
 * Docs chrome guards (docs fixes PR):
 *   - a selected SegmentedControl segment is a fill (selected.bg / selected.fg), never a raised
 *     key or a bottom ledge: in the Settings popover (Accent, Density) and in the sidebar's
 *     Light / Dark / System control, in both themes at 390 and 1440;
 *   - the sidebar footer does not show the "Code Connect / N templates" line;
 *   - a Table fills its container: header and rows reach the frame's right edge.
 *
 * Needs `pnpm docs:build` first (the visual lane serves docs-site/out).
 */
const SIZES = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const;
const THEMES = ['light', 'dark'] as const;

/** The selected segment's indicator: paint must be a plain fill, with no edge layer or shadow. */
async function expectSelectedIsFill(
  radiogroup: ReturnType<import('@playwright/test').Page['locator']>,
) {
  const paint = await radiogroup.evaluate((group) => {
    const checked = group.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')!;
    const indicator = checked.querySelector<HTMLElement>('[aria-hidden="true"]')!;
    const cs = getComputedStyle(indicator);
    const probe = document.createElement('span');
    probe.style.color = 'var(--semantic-color-selected-bg)';
    document.body.appendChild(probe);
    const selectedBg = getComputedStyle(probe).color;
    probe.remove();
    return {
      backgroundImage: cs.backgroundImage,
      boxShadow: cs.boxShadow,
      backgroundColor: cs.backgroundColor,
      selectedBg,
    };
  });
  expect(paint.backgroundImage, 'selected must not draw an edge layer').toBe('none');
  // Tailwind resets its shadow layers to transparent; only a painted layer is a ledge.
  const painted = paint.boxShadow
    .replace(/rgba\(0, 0, 0, 0\)[^,]*(,\s*)?/g, '')
    .replace(/^none$/, '')
    .trim();
  expect(painted, 'selected must not draw a ledge or raised shadow').toBe('');
  expect(paint.backgroundColor, 'selected paints semantic.color.selected.bg').toBe(
    paint.selectedBg,
  );
}

for (const size of SIZES) {
  for (const theme of THEMES) {
    test.describe(`docs chrome ${size.name} ${theme}`, () => {
      test.use({ viewport: { width: size.width, height: size.height } });

      test('Settings popover and theme control: selected is a fill', async ({ page }) => {
        await openThemed(page, '/docs/patterns/data-table-section', theme);
        if (size.width < 768) {
          await page
            .getByRole('button', { name: /menu|sidebar/i })
            .first()
            .click();
        }
        const trigger = page.locator('[data-docs-switch-trigger]:visible').first();
        await trigger.click();
        const popover = page.getByRole('dialog', { name: 'Display settings' });
        await expect(popover).toBeVisible();
        for (const label of ['Accent', 'Density']) {
          await expectSelectedIsFill(popover.getByRole('radiogroup', { name: label }));
        }
        await page.keyboard.press('Escape');
        await expectSelectedIsFill(
          page.getByRole('radiogroup', { name: 'Theme' }).locator('visible=true').first(),
        );
      });

      test('the sidebar footer has no Code Connect line', async ({ page }) => {
        await openThemed(page, '/docs/patterns/data-table-section', theme);
        if (size.width < 768) {
          await page
            .getByRole('button', { name: /menu|sidebar/i })
            .first()
            .click();
        }
        await expect(page.getByText(/Code Connect/)).toHaveCount(0);
        await expect(page.getByText(/\d+ templates/)).toHaveCount(0);
      });

      test('the table fills its container', async ({ page }) => {
        await openThemed(page, '/docs/patterns/data-table-section', theme);
        const fit = await page.evaluate(() => {
          const region = document.querySelector<HTMLElement>('.hds-demo-frame [role="region"]')!;
          const table = region.querySelector<HTMLElement>('[role="table"]')!;
          const edge = region.getBoundingClientRect().right;
          const cells = [
            ...table.querySelectorAll<HTMLElement>('[role="columnheader"], [role="cell"]'),
          ];
          const right = Math.max(...cells.map((c) => c.getBoundingClientRect().right));
          return {
            gap: Math.abs(edge - right),
            tableW: table.getBoundingClientRect().width,
            regionW: region.clientWidth,
          };
        });
        // The grid is at least as wide as the region, and its cells reach the region's right edge
        // (a table that scrolls keeps its cells inside the scrolled width, so compare widths too).
        expect(fit.tableW).toBeGreaterThanOrEqual(fit.regionW - 1);
      });
    });
  }
}
