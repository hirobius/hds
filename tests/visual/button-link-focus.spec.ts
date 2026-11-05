import { test, expect, type Locator } from '@playwright/test';
import { openThemed } from './theme';

/**
 * Button variant="link" focus ring (hds#1167). The link variant has no inline
 * padding, so the base box-shadow ring (ring-2 + ring-offset-2 on the md radius) hugged the
 * glyphs and the underline. It now draws an outline: role.ring colour, the thick border width,
 * a 2px offset and the control radius, on :focus-visible only, so the rest box never moves.
 *
 * Reads computed styles from the built docs page. Needs `pnpm docs:publish` first.
 */
const BUTTON = '/docs/components/button';

const LINK = '.hds-demo-frame button[data-variant="link"]';

async function box(btn: Locator) {
  return btn.evaluate((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      width: r.width,
      height: r.height,
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
      marginLeft: s.marginLeft,
      marginRight: s.marginRight,
    };
  });
}

async function focusStyle(btn: Locator) {
  return btn.evaluate((el) => {
    (el as HTMLElement).focus();
    const s = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.color = 'var(--role-ring)';
    el.parentElement!.appendChild(probe);
    const ring = getComputedStyle(probe).color;
    probe.remove();
    return {
      focusVisible: el.matches(':focus-visible'),
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      outlineOffset: s.outlineOffset,
      outlineColor: s.outlineColor,
      borderRadius: s.borderTopLeftRadius,
      boxShadow: s.boxShadow,
      ring,
    };
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`link button focus ring has room and keeps the rest box (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openThemed(page, BUTTON, theme);
    const btn = page.locator(LINK).first();
    await btn.scrollIntoViewIfNeeded();
    await expect(btn).toBeVisible();

    const rest = await box(btn);
    expect(rest.paddingLeft).toBe('0px');
    expect(rest.paddingRight).toBe('0px');

    const f = await focusStyle(btn);
    expect(f.focusVisible).toBe(true);
    expect(f.outlineStyle).toBe('solid');
    expect(f.outlineWidth).toBe('2px');
    expect(f.outlineOffset).toBe('2px');
    expect(f.outlineColor).toBe(f.ring);
    // semantic.radius.control (4px), not the md action radius sized for a padded fill.
    expect(f.borderRadius).toBe('4px');
    // No box-shadow ring left over to hug the glyphs.
    expect(f.boxShadow).not.toMatch(/0px 0px 0px [1-9]/);

    // Focus changes paint only: the box, padding and margins stay put.
    expect(await box(btn)).toEqual(rest);
  });
}

test('link button focus outline survives forced-colors mode', async ({ page }) => {
  await openThemed(page, BUTTON, 'light');
  await page.emulateMedia({ forcedColors: 'active' });
  const btn = page.locator(LINK).first();
  await btn.scrollIntoViewIfNeeded();
  const f = await focusStyle(btn);
  expect(f.focusVisible).toBe(true);
  expect(f.outlineStyle).toBe('solid');
  expect(f.outlineWidth).toBe('2px');
  expect(f.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
});
