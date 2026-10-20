import { test, expect } from '@playwright/test';

/**
 * Color swatch guard for the docs site (hds#846): Adrian saw every swatch on the Color
 * page render empty, the tile showing the page background instead of the color. Each
 * fill is `var(--primitive-color-*)`; this asserts, in light and dark, that every fill
 * is drawn (has width and height), is not transparent, and computes to the color its own
 * CSS variable resolves to, so a fill that falls back to the page background fails.
 * Plain @playwright/test (not Chromatic's), so it adds no snapshots.
 * Needs `pnpm docs:build` first.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`every Color page swatch is filled from its token (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto('/docs/foundations/color');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const fills = page.locator('.hds-swatch-fill, .hds-token-swatch');
    await expect(fills.first()).toBeAttached();

    const failures = await fills.evaluateAll((els) => {
      const out: string[] = [];
      for (const el of els as HTMLElement[]) {
        const fill = el.style.background;
        const label = `${fill || '(no fill)'} in ${el.closest('tr, .hds-swatch')?.textContent?.slice(0, 40)}`;
        if (!/^var\(--primitive-color-[\w-]+\)$/.test(fill)) {
          out.push(`not a primitive var: ${label}`);
          continue;
        }
        const box = el.getBoundingClientRect();
        const color = getComputedStyle(el).backgroundColor;
        const probe = document.createElement('span');
        probe.style.background = fill;
        el.parentElement!.appendChild(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        if (box.width < 8 || box.height < 8)
          out.push(`collapsed ${box.width}x${box.height}: ${label}`);
        if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent')
          out.push(`transparent: ${label}`);
        if (expected === 'rgba(0, 0, 0, 0)') out.push(`variable does not resolve: ${label}`);
        if (color !== expected) out.push(`${color} is not ${expected}: ${label}`);
      }
      return out;
    });

    expect(failures).toEqual([]);
  });
}
