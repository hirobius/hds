import { test, expect, type Locator } from '@playwright/test';
import { openThemed } from './theme';

/**
 * hds#1468: the selected pill of a SegmentedControl must be concentric with the rail.
 * Concentric rule: inner radius = outer radius - (padding + border). The rail is rounded-lg
 * (role radius + min(role radius, 4px), 12px by default), has a 1px border and 4px padding, so
 * the pill and every segment must be 12 - 5 = 7px, not the 8px of rounded-md. The rule has to
 * hold when a consumer sets railPadding, so the spec also rewrites the padding and re-measures.
 * Plain @playwright/test on the built docs site; needs `pnpm docs:build` first.
 */
const ROUTE = '/docs/components/segmented-control';
const px = (v: string) => parseFloat(v);

async function measure(rail: Locator) {
  return rail.evaluate((el) => {
    const r = getComputedStyle(el);
    const checked = el.querySelector('[role="radio"][aria-checked="true"]')!;
    const item = getComputedStyle(checked);
    const indicator = getComputedStyle(checked.querySelector('[aria-hidden="true"]')!);
    return {
      outer: r.borderTopLeftRadius,
      border: r.borderTopWidth,
      padding: r.paddingTop,
      item: item.borderTopLeftRadius,
      indicator: indicator.borderTopLeftRadius,
    };
  });
}

function expectConcentric(m: Awaited<ReturnType<typeof measure>>) {
  const want = Math.max(0, px(m.outer) - px(m.border) - px(m.padding));
  const why = `rail ${m.outer}, border ${m.border}, padding ${m.padding}: pill and segment want ${want}px`;
  expect(px(m.indicator), `indicator: ${why}`).toBeCloseTo(want, 1);
  expect(px(m.item), `segment: ${why}`).toBeCloseTo(want, 1);
}

for (const theme of ['light', 'dark'] as const) {
  test(`selected pill is concentric with the rail, every demo (${theme})`, async ({ page }) => {
    await openThemed(page, ROUTE, theme);
    const rails = page.locator('[role="radiogroup"]');
    await expect(rails.first()).toBeVisible();
    const count = await rails.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i++) {
      const rail = rails.nth(i);
      if ((await rail.locator('[aria-checked="true"]').count()) === 0) continue;
      expectConcentric(await measure(rail));
    }
  });

  test(`pill stays concentric when railPadding changes (${theme})`, async ({ page }) => {
    await openThemed(page, ROUTE, theme);
    const rail = page.locator('[role="radiogroup"]').first();
    await expect(rail).toBeVisible();
    for (const pad of ['2px', '6px']) {
      await rail.evaluate((el, p) => {
        // Same two writes the component makes for a railPadding prop.
        (el as HTMLElement).style.setProperty('--seg-rail-pad', p);
        (el as HTMLElement).style.padding = p;
      }, pad);
      expectConcentric(await measure(rail));
    }
  });
}
