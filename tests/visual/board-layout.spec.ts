import { test, expect } from '@playwright/test';

/**
 * Regression (hds#1114): at the Board's @3xl container width and wider, the first
 * BoardColumn must keep its 16rem floor (it collapsed to ~0 under the leftover
 * `grid-cols-1` track), and the visually-hidden count text must not widen the page.
 * Below @3xl the columns stack at the full Board width. Uses the Board on /tour.
 *
 * Run: `pnpm docs:build && pnpm exec playwright test tests/visual/board-layout.spec.ts`
 */
const route = '/tour';

for (const width of [1440, 1280, 390]) {
  test(`Board lays out its columns at ${width}px without widening the page`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await page.evaluate(() => document.fonts?.ready);
    const report = await page.evaluate(() => {
      const board = document.querySelector<HTMLElement>('[data-hds-component="Board"]');
      // The bug needs more columns than fit at the 16rem floor (the leftover 1fr track
      // only collapses when the row overflows), so pad the tour's Board out to eight.
      const track = board?.querySelector<HTMLElement>('[data-hds-board-track]');
      const last = track?.lastElementChild;
      while (track && last && track.children.length < 8) track.append(last.cloneNode(true));
      const columns = [...(track?.children ?? [])] as HTMLElement[];
      return {
        pageWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        boardWidth: board?.clientWidth ?? 0,
        columnWidths: columns.map((c) => Math.round(c.getBoundingClientRect().width)),
      };
    });
    expect(report.columnWidths.length).toBeGreaterThan(1);
    expect(report.pageWidth).toBeLessThanOrEqual(report.viewport);
    if (report.boardWidth >= 768) {
      // Side by side: every column, the first included, holds the 16rem floor.
      for (const w of report.columnWidths) expect(w).toBeGreaterThanOrEqual(255);
    } else {
      // Stacked: every column fills the Board.
      for (const w of report.columnWidths) expect(w).toBeGreaterThanOrEqual(report.boardWidth - 1);
    }
  });
}
