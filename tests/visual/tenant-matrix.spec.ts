import { test, expect } from '@playwright/test';
// @ts-expect-error -- plain ESM helper shared with the axe gate; no type declarations.
import { DEMO_SELECTOR } from '../../scripts/lib/docs-axe.mjs';
// @ts-expect-error -- docs-site is outside the root tsconfig include; Playwright resolves it.
import { DEFAULT_SWITCHES, STORAGE_KEY } from '../../docs-site/lib/preview-switches';
import { DEMO_SHOT, openThemed } from './theme';
import { BRANDS, matrixCases, type Brand, type Density } from './tenant-matrix';

/**
 * hds#126: per-tenant × per-density × per-theme baselines for the primitives
 * tenants restyle. The axes and how to extend them live in tenant-matrix.ts.
 * Same tolerance and workflow as docs-baselines.spec.ts: needs
 * `pnpm docs:publish`, runs under `pnpm test:visual-baselines`, re-take with
 * `pnpm test:visual-baselines:update`.
 */
type Mode = { brand: Brand | null; density: Density; read?: string };

/**
 * The docs density switch re-applies its saved choice on hydrate and would strip
 * a data-density set before it ran, so seed that saved choice too.
 */
async function seedDensity(page: import('@playwright/test').Page, density: Density) {
  await page.addInitScript(
    ([key, value]: string[]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage blocked: setMode below still applies */
      }
    },
    [STORAGE_KEY, JSON.stringify({ ...DEFAULT_SWITCHES, density })],
  );
}

/** Sets the root attributes and, given `read`, returns that custom property in the same task. */
function setMode({ brand, density, read }: Mode) {
  const el = document.documentElement;
  if (brand) el.setAttribute('data-brand', brand);
  else el.removeAttribute('data-brand');
  if (density === 'compact') el.setAttribute('data-density', 'compact');
  else el.removeAttribute('data-density');
  return read ? getComputedStyle(el).getPropertyValue(read).trim() : '';
}

test.describe('tenant matrix baselines @baseline', () => {
  // Without these, a renamed tenant or a dropped tenants.css import would leave
  // every brand snapshot identical to the default look and still pass.
  // A brand restyles some of these, not all: soft-demo keeps the accent and
  // changes radius and raised surfaces, so the guard checks the set (hds#1101).
  test('each brand overlay changes its restyled tokens', async ({ page }) => {
    await openThemed(page, '/docs/components/button', 'light');
    const reads = [
      '--semantic-color-surface-accent',
      '--semantic-radius-action',
      '--semantic-color-surface-raised',
    ];
    const snapshot = async (brand: Brand | null) => {
      const values: string[] = [];
      for (const read of reads)
        values.push(await page.evaluate(setMode, { brand, density: 'comfortable', read }));
      return values.join('|');
    };
    const base = await snapshot(null);
    for (const brand of BRANDS) expect(await snapshot(brand), brand).not.toBe(base);
  });

  test('compact density changes the type scale', async ({ page }) => {
    await openThemed(page, '/docs/components/button', 'light');
    const read = '--semantic-typography-body-font-size';
    const body = (density: Density) => page.evaluate(setMode, { brand: null, density, read });
    expect(await body('compact')).not.toBe(await body('comfortable'));
  });

  for (const c of matrixCases()) {
    test(`${c.route} ${c.brand} ${c.density} (${c.theme})`, async ({ page }) => {
      await seedDensity(page, c.density);
      await openThemed(page, c.route, c.theme);
      // Set the brand only after hydration: a late hydrate pass could otherwise
      // drop data-brand and a soft-demo shot would show the base corners (hds#1101).
      await page.waitForLoadState('networkidle');
      await page.evaluate(setMode, { brand: c.brand, density: c.density });
      await expect(page.locator('html')).toHaveAttribute('data-brand', c.brand);
      const demo = page.locator(DEMO_SELECTOR).first();
      await expect(demo).toBeVisible();
      await page.mouse.move(0, 0);
      await expect(demo).toHaveScreenshot(`${c.name}.png`, DEMO_SHOT);
    });
  }
});
