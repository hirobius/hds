import { test, expect } from '@playwright/test';

/**
 * hds#1198 (owner decision, 2026-11-05): the Table frame carries a full 1px
 * border.default outline with the rounded frame radius and clipped overflow, the
 * last row draws no second bottom line, and every cell centers its content
 * vertically with equal top and bottom padding, so text never sits low in a tall row.
 * Chromium computed styles, not class names: this is what the reader sees.
 *
 * Run: `pnpm docs:build && pnpm exec playwright test tests/visual/table-outline.spec.ts`
 */
const route = '/docs/components/table';

for (const width of [1440, 390]) {
  test(`${route} table is outlined and its cells are vertically centered at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await page.evaluate(() => document.fonts?.ready);
    const report = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[role="table"]')].map((table) => {
        const frame = table.closest('[role="region"]')?.parentElement as HTMLElement;
        const fs = getComputedStyle(frame);
        const rows = [...table.querySelectorAll<HTMLElement>('[role="row"]')];
        const lastRowCells = [
          ...(rows.at(-1)?.querySelectorAll<HTMLElement>('[role="cell"]') ?? []),
        ];
        const cells = [
          ...table.querySelectorAll<HTMLElement>('[role="cell"], [role="columnheader"]'),
        ];
        const offCenter = cells
          .map((cell) => {
            const cs = getComputedStyle(cell);
            const box = cell.getBoundingClientRect();
            const top = box.top + parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
            const bottom =
              box.bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth);
            const range = document.createRange();
            range.selectNodeContents(cell);
            const rects = [...range.getClientRects()].filter((r) => r.height > 0);
            if (rects.length === 0) return null;
            const contentTop = Math.min(...rects.map((r) => r.top));
            const contentBottom = Math.max(...rects.map((r) => r.bottom));
            const drift = Math.abs((contentTop + contentBottom) / 2 - (top + bottom) / 2);
            return {
              text: cell.textContent?.slice(0, 30),
              alignItems: cs.alignItems,
              display: cs.display,
              padEqual: cs.paddingTop === cs.paddingBottom,
              drift,
            };
          })
          .filter((c) => c !== null)
          .filter(
            (c) =>
              c.display !== 'flex' || c.alignItems !== 'center' || !c.padEqual || c.drift > 1.5,
          );
        return {
          border: [
            fs.borderTopWidth,
            fs.borderRightWidth,
            fs.borderBottomWidth,
            fs.borderLeftWidth,
          ],
          borderStyle: fs.borderTopStyle,
          borderColorSet: fs.borderTopColor !== 'rgba(0, 0, 0, 0)',
          radius: parseFloat(fs.borderTopLeftRadius),
          overflow: fs.overflow,
          lastRowBottoms: lastRowCells.map((c) => getComputedStyle(c).borderBottomWidth),
          offCenter,
        };
      }),
    );
    expect(report.length).toBeGreaterThan(0);
    for (const table of report) {
      expect(table.border).toEqual(['1px', '1px', '1px', '1px']);
      expect(table.borderStyle).toBe('solid');
      expect(table.borderColorSet).toBe(true);
      expect(table.radius).toBeGreaterThan(0);
      expect(table.overflow).toBe('hidden');
      for (const bottom of table.lastRowBottoms) expect(bottom).toBe('0px');
      expect(table.offCenter).toEqual([]);
    }
  });
}
