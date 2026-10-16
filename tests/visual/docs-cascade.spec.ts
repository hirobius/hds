import { test, expect } from '@playwright/test';

/**
 * Cascade guard for the docs site (#754). HDS's mono typography (src/styles/mono-type.css)
 * is unlayered on purpose so it beats Fumadocs' layered prose `code` size. When #698 moved it
 * into `@layer utilities`, inline code in every props table went 15px -> 13px and 14+ pages
 * shifted, while the snapshot-only docs-demos spec stayed green. This asserts the computed
 * style directly. Plain @playwright/test (not Chromatic's), so it adds no snapshots.
 * Needs `pnpm docs:build` first.
 */
test('inline code in docs props tables uses the HDS mono type token', async ({ page }) => {
  await page.goto('/docs/components/input');
  const code = page.locator('td > code').first();
  await expect(code).toBeAttached();

  const { actual, expected } = await code.evaluate((el) => {
    const pick = (s: CSSStyleDeclaration) => ({
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      fontFamily: s.fontFamily,
    });
    const probe = document.createElement('span');
    probe.style.cssText = [
      'font-size: var(--semantic-typography-mono-font-size)',
      'line-height: var(--semantic-typography-mono-line-height)',
      'font-family: var(--semantic-typography-mono-font-family)',
    ].join(';');
    el.parentElement!.appendChild(probe);
    const out = { actual: pick(getComputedStyle(el)), expected: pick(getComputedStyle(probe)) };
    probe.remove();
    return out;
  });

  expect(actual).toEqual(expected);
});
