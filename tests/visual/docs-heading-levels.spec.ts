import { test, expect, type Page } from '@playwright/test';

/**
 * Docs heading levels (hds#847 A): the page title (H1) takes the `display` type role,
 * section heads (H2) `title`, sub-heads (H3) `titleSm`, so each level is a clear step
 * down. Asserts computed styles against a probe set from the token variables, on a
 * foundation, a component, a guide and a section landing page, at phone and desktop.
 * Demo content (.hds-demo-frame) keeps its own type. Needs `pnpm docs:build` first.
 */
const ROLES = { h1: 'display', h2: 'title', h3: 'titleSm' } as const;
const PAGES = [
  '/docs/foundations/color',
  '/docs/foundations/typography',
  '/docs/components/button',
  '/docs/guides/tokens',
  '/docs/components',
];

async function headingStyles(page: Page) {
  return page.evaluate((roles) => {
    const pick = (el: Element) => {
      const s = getComputedStyle(el);
      return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing].join(' | ');
    };
    const out: { tag: string; text: string; actual: string; expected: string }[] = [];
    const scope = document.querySelector('#nd-page')!;
    for (const [tag, role] of Object.entries(roles)) {
      const probe = document.createElement(tag);
      probe.style.cssText = [
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
      ]
        .map((p) => `${p}: var(--semantic-typography-${role}-${p})`)
        .join(';');
      scope.appendChild(probe);
      const expected = pick(probe);
      probe.remove();
      const els = [...scope.querySelectorAll(tag)].filter(
        (el) =>
          el === scope.querySelector('h1') ||
          (el.closest('.prose') && !el.closest('.hds-demo-frame')),
      );
      for (const el of els)
        out.push({ tag, text: el.textContent!.slice(0, 30), actual: pick(el), expected });
    }
    return out;
  }, ROLES);
}

for (const width of [1440, 390]) {
  for (const path of PAGES) {
    test(`${path} headings step down the type ramp at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const rows = await headingStyles(page);
      expect(rows.some((r) => r.tag === 'h1')).toBe(true);
      for (const r of rows)
        expect(`${r.tag} "${r.text}": ${r.actual}`).toBe(`${r.tag} "${r.text}": ${r.expected}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, 'page scrolls sideways').toBe(false);
    });
  }
}

/**
 * Foundation pages (hds#847 C): Tokens is the first section after the lead, and
 * Principle + Best practices sit in one collapsed HDS Disclosure inside a bordered Card.
 */
for (const slug of ['color', 'typography', 'spacing', 'radius', 'elevation', 'motion']) {
  test(`${slug}: Tokens leads, principles fold into one collapsed disclosure`, async ({ page }) => {
    await page.goto(`/docs/foundations/${slug}`);
    const firstH2 = page.locator('#nd-page .prose h2').first();
    await expect(firstH2).toHaveText('Tokens');
    const trigger = page.getByRole('button', { name: 'Principles and best practices' });
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#nd-page .prose details:has-text("Principle")')).toHaveCount(0);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator(`#${await trigger.getAttribute('aria-controls')}`);
    await expect(panel.getByRole('heading', { name: 'Principle', exact: true })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Best practices' })).toBeVisible();
    const border = await trigger.evaluate((el) => {
      const card = el.closest('.hds-principles');
      return card ? getComputedStyle(card).borderTopWidth : 'no card';
    });
    expect(border).toBe('1px');
  });
}
