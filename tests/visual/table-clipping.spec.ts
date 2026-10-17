import { test, expect } from '@playwright/test';

/**
 * Regression: a Table must never shear its content on desktop. Before the fix every
 * column was `minmax(0, 1fr)`, so a long link or a button row could not widen its
 * track; it spilled out of its cell, under the next column, and past the frame where
 * nothing could scroll to it. A table either fits (every cell holds its content), or
 * its grid is wider than the frame and the frame scrolls.
 * Needs `pnpm docs:publish` (or `pnpm docs:build`) first; serves docs-site/out.
 */
const route = '/docs/components/table';

for (const width of [1440, 1280, 390]) {
  test(`Table demo never clips at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await page.evaluate(() => document.fonts?.ready);
    const report = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[role="table"]')].map((table) => {
        const cells = [
          ...table.querySelectorAll<HTMLElement>('[role="cell"], [role="columnheader"]'),
        ];
        const overflowingCells = cells
          .filter((cell) => cell.scrollWidth > cell.clientWidth + 1)
          .map((cell) => cell.textContent?.slice(0, 40));
        let scroller: HTMLElement | null = table.parentElement;
        while (scroller && getComputedStyle(scroller).overflowX === 'visible') {
          scroller = scroller.parentElement;
        }
        const scrolls = scroller
          ? ['auto', 'scroll'].includes(getComputedStyle(scroller).overflowX)
          : false;
        const wider = scroller ? table.scrollWidth > scroller.clientWidth + 1 : false;
        return { overflowingCells, unscrollableOverflow: wider && !scrolls };
      }),
    );
    expect(report.length).toBeGreaterThan(0);
    for (const table of report) {
      expect(table.overflowingCells).toEqual([]);
      expect(table.unscrollableOverflow).toBe(false);
    }
  });
}
