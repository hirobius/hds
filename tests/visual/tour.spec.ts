import { test, expect } from '@chromatic-com/playwright';

/**
 * /tour, "HDS Console" (hds#795): one snapshot per viewport (1440 and 390) and
 * theme (light, dark), taken by Chromatic like docs-demos.spec.ts, plus two checks
 * a snapshot cannot make: the page never scrolls sideways, and it settles without
 * layout shift (CLS under 0.1). A PNG of each run is also written to
 * reports/tour/ for a look by hand. Needs `pnpm docs:publish` first.
 */
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const;

type Probe = { __cls: number };

test.describe('docs tour page', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`/tour ${viewport.name} (${theme})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript((t: string) => {
          try {
            localStorage.setItem('theme', t);
          } catch {
            /* storage blocked: the attributes set below still apply */
          }
          const probe = window as unknown as Probe;
          probe.__cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as {
              value: number;
              hadRecentInput: boolean;
            }[]) {
              if (!entry.hadRecentInput) probe.__cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        }, theme);
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
        await page.goto('/tour');
        await page.evaluate((t: string) => {
          const el = document.documentElement;
          el.setAttribute('data-theme', t);
          el.classList.toggle('dark', t === 'dark');
          el.classList.toggle('light', t === 'light');
        }, theme);
        await expect(page.locator('.hds-tour')).toBeVisible();
        await expect(page.getByRole('heading', { level: 1, name: 'HDS Console' })).toBeVisible();
        await page.evaluate(() => document.fonts?.ready);
        await page.waitForTimeout(500);

        const { scrollWidth, clientWidth, cls } = await page.evaluate(() => ({
          // body is overflow-x hidden in the docs shell, so html alone would hide a wide child.
          scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          clientWidth: document.documentElement.clientWidth,
          cls: (window as unknown as Probe).__cls,
        }));
        expect(scrollWidth, 'no horizontal scroll').toBeLessThanOrEqual(clientWidth);
        expect(cls, 'cumulative layout shift').toBeLessThan(0.1);

        await page.screenshot({
          path: `reports/tour/tour-${viewport.name}-${theme}.png`,
          fullPage: true,
        });
      });
    }
  }
});
