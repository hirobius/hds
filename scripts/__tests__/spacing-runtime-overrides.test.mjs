/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#206 slice 3 — the two runtime-overridden spacing tokens.
 *
 * semantic.space.component.padding (tenant + density override in
 * tenants.css) and semantic.space.layout.gutter (responsive override in
 * theme.css) were renamed to semantic.space.surface.padding and
 * semantic.space.region.gutter. Their overrides are expressed as steps on
 * the t-shirt scale. The old names stayed as $deprecated aliases until 0.33.0
 * removed them (hds#625; the hds-token-aliases codemod moves consumers).
 *
 * The last block renders the real stylesheets in Chromium and locks the
 * computed pixels for every tenant x density x breakpoint (hds#206 finish).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { chromiumForTests } from '../lib/browser-host.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const tokens = JSON.parse(read('hirobius.tokens.json'));
const space = tokens.semantic.space;

describe('canonical overridable spacing tokens', () => {
  it('surface.padding defaults to scale.md and region.gutter to scale.lg (2026-10 bump)', () => {
    expect(space.surface.padding.$value).toBe('{semantic.space.scale.md}');
    expect(space.region.gutter.$value).toBe('{semantic.space.scale.lg}');
  });

  it('component.padding and layout.gutter are gone (hds#625)', () => {
    expect(space.component.padding).toBeUndefined();
    expect(space.layout).toBeUndefined();
  });
});

describe('runtime overrides sit on the new names and on scale steps', () => {
  it('brutalist-demo overrides surface.padding with scale.sm, scale.xs under compact', () => {
    const overlay = JSON.parse(read('directions/brutalist-demo/tokens.json'));
    const leaf = overlay.semantic.space.surface.padding;
    expect(leaf.$value).toBe('{semantic.space.scale.sm}');
    expect(leaf.$extensions['com.figma.variables'].modes.Compact).toBe('{semantic.space.scale.xs}');
    expect(overlay.semantic.space.component).toBeUndefined();
  });

  it('tenants.css overrides the new var and no removed alias', () => {
    const css = read('src/styles/tenants.css');
    expect(css).toMatch(/--semantic-space-surface-padding: var\(\s*--semantic-space-scale-sm\s*\)/);
    expect(css).toMatch(/--semantic-space-surface-padding: var\(\s*--semantic-space-scale-xs\s*\)/);
    expect(css).not.toMatch(/--semantic-space-component-padding\s*:/);
  });

  it('theme.css sets region.gutter responsively from scale steps, not raw px', () => {
    const css = read('src/styles/theme.css');
    expect(css).toContain('--semantic-space-region-gutter: var(--semantic-space-scale-lg);');
    expect(css).toContain('--semantic-space-region-gutter: var(--semantic-space-scale-sm);');
    expect(css).not.toMatch(/--semantic-space-layout-gutter\s*:/);
  });

  it('tokens.generated.css declares no removed alias', () => {
    const css = read('src/styles/tokens.generated.css');
    expect(css).not.toMatch(/--semantic-space-(component-padding|layout-gutter)\s*:/);
  });
});

/*
 * The computed pixels, not just the CSS text. Every tenant x density x breakpoint,
 * with the attributes on <html> and on a nested element (a var() resolves where it
 * is declared, so the two can differ). Both must keep today's values.
 */
// scripts/lib/browser-host.mjs finds the browser; none means skip, unless
// HDS_REQUIRE_BROWSER=1 (CI), where it throws.
const CHROMIUM = chromiumForTests();
const hasBrowser = Boolean(CHROMIUM);

/** Today's surface.padding in px per tenant, [comfortable, compact] (2026-10 bump: scale 8/20/28/40/64; compact density for apps 8/12/16/24/32). */
const SURFACE_PX = {
  base: [28, 16],
  'accent-lilac': [28, 16],
  'brutalist-demo': [20, 8],
  // Design-explorations demo directions (hds#628): soft-demo opens surfaces up (scale.lg, scale.md
  // compact); accent-pair-demo changes colour only.
  'soft-demo': [40, 16],
  'accent-pair-demo': [28, 16],};
/** Today's region.gutter in px per viewport width, [comfortable, compact]. Same for every tenant. */
const GUTTER_PX = { 1280: [40, 24], 640: [40, 24], 639: [20, 12], 400: [20, 12] };

// theme.css pulls in Tailwind first; the browser skips what it cannot parse, and the
// custom properties this reads are plain CSS.
const PAGE_CSS = [
  read('src/styles/tokens.generated.css'),
  read('src/styles/tenants.css'),
  read('src/styles/theme.css').replace(/^@(import|config)[^;]*;/gm, ''),
].join('\n');

const PROBE =
  'display:block;padding-top:var(--semantic-space-surface-padding);' +
  'padding-bottom:var(--semantic-space-region-gutter)';

describe('every direction has a row in the computed-value table', () => {
  it('matches the directions/ directory', () => {
    const tenants = readdirSync(join(ROOT, 'directions'), { withFileTypes: true })
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
  // Launching Chromium takes longer than vitest's 10s hook default when other
  // browser suites (spacing-computed-lock) start at the same moment on a busy
  // machine, so give the launch the same headroom the computed lock has.
  beforeAll(async () => {
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage();
  }, 120_000);
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
        const [surface, region] = await page.evaluate((probe) => {
          const el = document.getElementById('p');
          el.style.cssText = probe;
          const s = getComputedStyle(el);
          return [s.paddingTop, s.paddingBottom].map(parseFloat);
        }, PROBE);
        const where = `${width}px`;
        expect({ where, surface, region }).toEqual({
          where,
          surface: SURFACE_PX[tenant][d],
          region: GUTTER_PX[width][d],
        });
      }
    },
  );
});
