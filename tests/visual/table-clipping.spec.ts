import { test, expect } from '@playwright/test';

/**
 * Regression: a Table must never shear its content on desktop. Before the fix every
 * column was `minmax(0, 1fr)`, so a long link or a button row could not widen its
 * track; it spilled out of its cell, under the next column, and past the frame where
 * nothing could scroll to it. A table either fits (every cell holds its content), or
 * its grid is wider than the frame and the frame scrolls.
 * Literal values (a date, a number, a token name, a URL) also stay on one line: a
 * date split at its hyphens or a URL split mid-word reads as two values.
 *
 * Run: `pnpm docs:build && pnpm exec playwright test tests/visual/table-clipping.spec.ts`
 * (playwright.config.ts serves docs-site/out and finds Chromium in /opt/pw-browsers).
 */
const routes = ['/docs/components/table', '/docs/patterns/data-table-section'];

for (const route of routes) {
  for (const width of [1440, 1280, 390]) {
    test(`${route} never clips a table at ${width}px`, async ({ page }) => {
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
          // A literal cell is a value/token slot, or any cell whose text is a date or a
          // URL. Count its distinct line boxes from the text's client rects.
          const literal = /^(\d{4}-\d{2}-\d{2}|https?:\/\/\S+|[\d.,%$-]+)$/;
          const wrappedLiterals = [...table.querySelectorAll<HTMLElement>('[role="cell"]')]
            .filter(
              (cell) =>
                ['value', 'token'].includes(cell.dataset.slot ?? '') ||
                literal.test(cell.textContent?.trim() ?? ''),
            )
            .filter((cell) => {
              const range = document.createRange();
              range.selectNodeContents(cell);
              const tops = new Set(
                [...range.getClientRects()]
                  .filter((rect) => rect.width > 0)
                  .map((rect) => Math.round(rect.top)),
              );
              return tops.size > 1;
            })
            .map((cell) => cell.textContent?.slice(0, 40));
          return {
            overflowingCells,
            wrappedLiterals,
            unscrollableOverflow: wider && !scrolls,
          };
        }),
      );
      expect(report.length).toBeGreaterThan(0);
      // ...and no table pushes the page itself sideways.
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(pageOverflow).toBeLessThanOrEqual(1);
      for (const table of report) {
        expect(table.overflowingCells).toEqual([]);
        expect(table.wrappedLiterals).toEqual([]);
        expect(table.unscrollableOverflow).toBe(false);
      }
    });
  }
}
