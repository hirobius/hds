import { test, expect } from '@playwright/test';
import { openThemed } from './theme';

/**
 * SegmentedControl geometry guard, for every control the docs render (the header Theme
 * control is `sm`, the demos are `md`), in both themes:
 *   - each segment box sits inside the track with equal top and bottom inset (within 1px);
 *   - all labels share one text baseline (within 1px);
 *   - each label's text is vertically centred in its segment (within 1px). Equal baselines
 *     alone miss a label that every segment shares but that sits off-centre.
 *
 * Needs `pnpm docs:build` first (the visual lane serves docs-site/out).
 */
const ROUTES = ['/docs/components/segmented-control', '/docs/components/tabs'];

for (const theme of ['light', 'dark'] as const) {
  for (const route of ROUTES) {
    test(`segmented controls are centred and aligned: ${route} (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await openThemed(page, route, theme);
      const rows = await page.evaluate(() => {
        const out: Record<string, unknown>[] = [];
        for (const group of document.querySelectorAll<HTMLElement>('[role="radiogroup"]')) {
          const track = group.getBoundingClientRect();
          if (!track.width || !track.height) continue;
          const segs = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
          const baselines: number[] = [];
          for (const seg of segs) {
            const box = seg.getBoundingClientRect();
            const walker = document.createTreeWalker(seg, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            let text: Text | null = null;
            while ((node = walker.nextNode())) {
              if (
                node.textContent?.trim() &&
                !node.parentElement?.closest('[aria-hidden="true"]')
              ) {
                text = node as Text;
                break;
              }
            }
            if (!text) continue;
            const range = document.createRange();
            range.selectNodeContents(text);
            const glyph = range.getBoundingClientRect();
            baselines.push(glyph.bottom);
            out.push({
              name: group.getAttribute('aria-label') ?? group.id ?? 'segmented',
              label: text.textContent!.trim(),
              insetTop: box.top - track.top,
              insetBottom: track.bottom - box.bottom,
              offCentre: glyph.top + glyph.height / 2 - (box.top + box.height / 2),
            });
          }
          const spread = baselines.length ? Math.max(...baselines) - Math.min(...baselines) : 0;
          out.push({
            name: group.getAttribute('aria-label') ?? 'segmented',
            baselineSpread: spread,
          });
        }
        return out;
      });
      expect(rows.length, 'the page renders at least one segmented control').toBeGreaterThan(0);
      for (const r of rows) {
        const who = `${r.name} ${r.label ?? ''}`.trim();
        if (r.baselineSpread !== undefined) {
          expect(
            r.baselineSpread as number,
            `${who}: labels share one baseline`,
          ).toBeLessThanOrEqual(1);
          continue;
        }
        const { insetTop, insetBottom, offCentre } = r as Record<string, number>;
        expect(insetTop, `${who}: segment inside the track`).toBeGreaterThanOrEqual(0);
        expect(insetBottom, `${who}: segment inside the track`).toBeGreaterThanOrEqual(0);
        expect(
          Math.abs(insetTop - insetBottom),
          `${who}: equal top and bottom inset`,
        ).toBeLessThanOrEqual(1);
        expect(Math.abs(offCentre), `${who}: label centred in its segment`).toBeLessThanOrEqual(1);
      }
    });
  }
}
