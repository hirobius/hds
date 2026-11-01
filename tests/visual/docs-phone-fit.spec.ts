import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

/**
 * Docs pages on a phone (Adrian's review, 2026-10-22). At 390px, on every component and
 * pattern page:
 *   - the page title never breaks inside a word ("DataTableSe / ction"): each word of the H1
 *     sits on one line, and the title is still the display size wherever it fits;
 *   - the design-tokens table fits: no Light / Dark column runs off the right edge;
 *   - the page never scrolls sideways.
 * And the DataTableSection demo shows its Action column.
 *
 * Run: `pnpm docs:build && pnpm exec playwright test tests/visual/docs-phone-fit.spec.ts`.
 */
const OUT = fileURLToPath(new URL('../../docs-site/out/docs', import.meta.url));
const routes = (section: string) =>
  readdirSync(join(OUT, section))
    .filter((f) => f.endsWith('.html'))
    .map((f) => `/docs/${section}/${f.replace(/\.html$/, '')}`);

const PAGES = [...routes('components'), ...routes('patterns')];

test.describe('docs pages at 390', () => {
  test.use({ viewport: { width: 390, height: 900 } });

  for (const route of PAGES) {
    test(`${route}: title keeps words whole, tables fit`, async ({ page }) => {
      await page.goto(route);
      await page.evaluate(() => document.fonts?.ready);
      await page.evaluate(() =>
        document.querySelectorAll('details').forEach((d) => (d.open = true)),
      );
      const report = await page.evaluate(() => {
        const h1 = document.querySelector<HTMLElement>('#nd-page h1')!;
        const text = h1.firstChild as Text;
        const split: string[] = [];
        for (const m of (text.textContent ?? '').matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(text, m.index!);
          range.setEnd(text, m.index! + m[0].length);
          const tops = new Set(
            [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
          );
          if (tops.size > 1) split.push(m[0]);
        }
        const tables = [...document.querySelectorAll<HTMLElement>('.hds-token-table')].map(
          (t) => t.getBoundingClientRect().right,
        );
        return {
          split,
          fontSize: parseFloat(getComputedStyle(h1).fontSize),
          titleOverflows: h1.scrollWidth > h1.clientWidth + 1,
          tableRight: Math.max(0, ...tables),
          pageScrolls: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(report.split, 'title words broken across lines').toEqual([]);
      expect(report.titleOverflows, 'title runs past its column').toBe(false);
      expect(report.fontSize, 'title shrank below a readable size').toBeGreaterThanOrEqual(24);
      expect(report.tableRight, 'token table runs off the right edge').toBeLessThanOrEqual(390);
      expect(report.pageScrolls, 'page scrolls sideways').toBe(false);
    });
  }

  test('a short title keeps the full display size', async ({ page }) => {
    await page.goto('/docs/components/button');
    const [size, display] = await page.evaluate(() => {
      const h1 = document.querySelector('#nd-page h1')!;
      const probe = document.createElement('h1');
      probe.style.fontSize = 'var(--semantic-typography-display-font-size)';
      document.body.appendChild(probe);
      const out = [getComputedStyle(h1).fontSize, getComputedStyle(probe).fontSize];
      probe.remove();
      return out;
    });
    expect(size).toBe(display);
  });

  test('the DataTableSection demo shows its Action column', async ({ page }) => {
    await page.goto('/docs/patterns/data-table-section');
    await page.evaluate(() => document.fonts?.ready);
    const fits = await page.evaluate(() => {
      const region = document.querySelector<HTMLElement>('.hds-demo-frame [role="region"]')!;
      return region.scrollWidth <= region.clientWidth + 1;
    });
    expect(fits, 'the table scrolls, hiding the Action column').toBe(true);
  });
});
