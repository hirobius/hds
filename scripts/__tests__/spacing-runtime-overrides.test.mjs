/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#206 slice 3 — the two runtime-overridden spacing tokens.
 *
 * semantic.space.component.padding (tenant + density override in
 * tenants.css) and semantic.space.layout.gutter (responsive override in
 * theme.css) are renamed to semantic.space.surface.padding and
 * semantic.space.region.gutter. Their overrides are expressed as steps on
 * the t-shirt scale, and the old names stay as $deprecated aliases so
 * consumers that have not run the codemod keep the same computed values.
 *
 * The last block renders the real stylesheets in Chromium and locks the
 * computed pixels for every tenant x density x breakpoint (hds#206 finish).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const tokens = JSON.parse(read('hirobius.tokens.json'));
const space = tokens.semantic.space;

describe('canonical overridable spacing tokens', () => {
  it('surface.padding and region.gutter default to scale.md (24px, unchanged)', () => {
    expect(space.surface.padding.$value).toBe('{semantic.space.scale.md}');
    expect(space.region.gutter.$value).toBe('{semantic.space.scale.md}');
  });

  it('keeps component.padding and layout.gutter as $deprecated aliases of the new names', () => {
    expect(space.component.padding.$value).toBe('{semantic.space.surface.padding}');
    expect(space.component.padding.$deprecated).toMatch(/surface\.padding/);
    expect(space.layout.gutter.$value).toBe('{semantic.space.region.gutter}');
    expect(space.layout.gutter.$deprecated).toMatch(/region\.gutter/);
  });
});

describe('runtime overrides sit on the new names and on scale steps', () => {
  it('brutalist-demo overrides surface.padding with scale.sm, scale.xs under compact', () => {
    const overlay = JSON.parse(read('tenants/brutalist-demo/tokens.json'));
    const leaf = overlay.semantic.space.surface.padding;
    expect(leaf.$value).toBe('{semantic.space.scale.sm}');
    expect(leaf.$extensions['com.figma.variables'].modes.Compact).toBe('{semantic.space.scale.xs}');
    expect(overlay.semantic.space.component).toBeUndefined();
  });

  it('tenants.css overrides the new var and re-anchors the deprecated alias', () => {
    const css = read('src/styles/tenants.css');
    expect(css).toMatch(/--semantic-space-surface-padding: var\(\s*--semantic-space-scale-sm\s*\)/);
    expect(css).toMatch(/--semantic-space-surface-padding: var\(\s*--semantic-space-scale-xs\s*\)/);
    expect(css).toMatch(
      /--semantic-space-component-padding: var\(\s*--semantic-space-surface-padding\s*\)/,
    );
    expect(css).not.toMatch(/--semantic-space-component-padding: var\(\s*--primitive-/);
  });

  it('theme.css sets region.gutter responsively from scale steps, not raw px', () => {
    const css = read('src/styles/theme.css');
    expect(css).toContain('--semantic-space-region-gutter: var(--semantic-space-scale-lg);');
    expect(css).toContain('--semantic-space-region-gutter: var(--semantic-space-scale-sm);');
    // The deprecated alias is only re-declared inside the zero-specificity compact
    // scope (hds#336), so nested scopes resolve it against the remapped scale;
    // everywhere else it follows region.gutter via its :root alias in tokens.css.
    const outsideCompact = css.replace(/:where\(\[data-density='compact'\]\)\s*\{[^}]*\}/g, '');
    expect(outsideCompact).not.toMatch(/--semantic-space-layout-gutter\s*:/);
  });

  it('tokens.css declares the deprecated aliases as var() of the new names', () => {
    const css = read('src/styles/tokens.css');
    expect(css).toContain(
      '--semantic-space-component-padding: var(--semantic-space-surface-padding);',
    );
    expect(css).toContain('--semantic-space-layout-gutter: var(--semantic-space-region-gutter);');
  });
});

/*
 * The computed pixels, not just the CSS text. Every tenant x density x breakpoint,
 * with the attributes on <html> and on a nested element (a var() resolves where it
 * is declared, so the two can differ). The deprecated name must compute to the same
 * pixels as its replacement in every cell, and both must keep today's values.
 */
const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const hasBrowser = existsSync(CHROMIUM);

/** Today's surface.padding in px per tenant, [comfortable, compact]. */
const SURFACE_PX = {
  base: [24, 20],
  'accent-lilac': [24, 20],
  'brutalist-demo': [16, 6],
  'concrete-creations': [24, 20],
};
/** Today's region.gutter in px per viewport width, [comfortable, compact]. Same for every tenant. */
const GUTTER_PX = { 1280: [32, 24], 640: [32, 24], 639: [16, 12], 400: [16, 12] };

// theme.css pulls in Tailwind first; the browser skips what it cannot parse, and the
// custom properties this reads are plain CSS.
const PAGE_CSS = [
  read('src/styles/tokens.generated.css'),
  read('src/styles/tenants.css'),
  read('src/styles/theme.css').replace(/^@(import|config)[^;]*;/gm, ''),
].join('\n');

const PROBE =
  'display:block;padding-top:var(--semantic-space-surface-padding);' +
  'padding-right:var(--semantic-space-component-padding);' +
  'padding-bottom:var(--semantic-space-region-gutter);' +
  'padding-left:var(--semantic-space-layout-gutter)';

describe('every tenant has a row in the computed-value table', () => {
  it('matches the tenants/ directory', () => {
    const tenants = readdirSync(join(ROOT, 'tenants'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name)
      .sort();
    expect(
      Object.keys(SURFACE_PX)
        .filter((t) => t !== 'base')
        .sort(),
    ).toEqual(tenants);
  });
});

describe.skipIf(!hasBrowser)('computed spacing, every tenant x density x breakpoint', () => {
  let browser;
  let page;
  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage();
  });
  afterAll(async () => {
    await browser?.close();
  });

  const cells = [];
  for (const tenant of Object.keys(SURFACE_PX)) {
    for (const [density, d] of [
      ['comfortable', 0],
      ['compact', 1],
    ]) {
      for (const scope of ['html', 'nested']) cells.push({ tenant, density, d, scope });
    }
  }

  it.each(cells)(
    '$tenant, $density, attributes on $scope',
    async ({ tenant, density, d, scope }) => {
      const attrs = [
        tenant === 'base' ? '' : `data-brand="${tenant}"`,
        density === 'compact' ? 'data-density="compact"' : '',
      ].join(' ');
      const body = scope === 'html' ? '<i id="p"></i>' : `<div ${attrs}><i id="p"></i></div>`;
      await page.setContent(
        `<html ${scope === 'html' ? attrs : ''}><head><style>${PAGE_CSS}</style></head><body>${body}</body></html>`,
      );

      for (const width of Object.keys(GUTTER_PX).map(Number)) {
        await page.setViewportSize({ width, height: 600 });
        const [surface, padding, region, gutter] = await page.evaluate((probe) => {
          const el = document.getElementById('p');
          el.style.cssText = probe;
          const s = getComputedStyle(el);
          return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat);
        }, PROBE);
        const where = `${width}px`;
        expect({ where, surface, region }).toEqual({
          where,
          surface: SURFACE_PX[tenant][d],
          region: GUTTER_PX[width][d],
        });
        expect({ where, padding, gutter }).toEqual({ where, padding: surface, gutter: region });
      }
    },
  );
});
