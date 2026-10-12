/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Design explorations, phase 0 (hds#628): the two demo tenants.
 *
 *   soft-demo         hds#505's token deltas, as an overlay (pill actions, soft
 *                     containers, grey-fill grouping, roomier surfaces)
 *   accent-pair-demo  a primary accent plus a supporting accent. There is no
 *                     supporting-accent token yet, so the supporting half is a
 *                     CSS-variable overlay scoped to the tenant (#628 decision 4)
 *
 * What a consumer sees is checked, not the generator's internals:
 *
 *   - the files: metadata that marks a demo (and keeps it out of Figma), an
 *     overlay `check-tenant-tokens` accepts, a compiled block in the committed
 *     `src/styles/tenants.css`
 *   - the computed values: the real stylesheets in Chromium, default and both
 *     tenants side by side, light and dark, on <html> and on a nested element
 *     (a var() resolves where it is declared, so the two can differ)
 *   - the numbers that make it usable: the supporting accent clears WCAG AA
 *     against the fills and surfaces it is meant for
 *
 * The computed half skips where Playwright has no Chromium; the file half runs
 * everywhere.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { chromiumPath } from '../lib/browser-host.mjs';
import { buildTenantCSS, validateTenantOverlay } from '../build-tokens.mjs';
import { readTokenSource } from '../lib/token-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));
const base = readTokenSource(join(ROOT, 'hirobius.tokens.json'));
const tailwind = createRequire(import.meta.url)('../../tailwind.config.tokens.cjs');

const SLUGS = ['soft-demo', 'accent-pair-demo'];

// ── The files ────────────────────────────────────────────────────────────────

describe.each(SLUGS)('%s: files', (slug) => {
  const dir = `tenants/${slug}`;

  it('is a demo tenant: tier 1, empty deployment and legal, status scaffold', () => {
    const meta = readJson(`${dir}/metadata.json`);
    expect(meta).toMatchObject({ slug, demo: true, tier: 1, status: 'scaffold' });
    expect(Object.values(meta.deployment).every((v) => v === null)).toBe(true);
    expect(Object.values(meta.legal).every((v) => v === null)).toBe(true);
    expect(typeof meta.displayName).toBe('string');
  });

  it('is not a Figma Brand mode (publishing to the shared library is Adrian’s call)', () => {
    expect(readJson('figma/brand-modes.json').tenants).not.toContain(slug);
  });

  it('has an overlay the validator accepts, and `check-tenant-tokens` exits 0', () => {
    const overlay = readJson(`${dir}/tokens.json`);
    expect(String(overlay.$schema)).toMatch(/hirobius\.tenant-tokens\.schema\.json$/);
    expect(validateTenantOverlay(overlay, base, slug)).toEqual([]);
    expect(() =>
      execFileSync('node', ['scripts/check-tenant-tokens.mjs'], { cwd: ROOT, stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('overrides no primitive and only the semantic, component and role tiers', () => {
    const overlay = readJson(`${dir}/tokens.json`);
    const tiers = Object.keys(overlay).filter((k) => !k.startsWith('$'));
    expect(tiers.length).toBeGreaterThan(0);
    for (const tier of tiers) expect(['semantic', 'component', 'role']).toContain(tier);
  });

  it('is compiled into the committed src/styles/tenants.css (run `pnpm tokens`)', () => {
    const { css, tenants } = buildTenantCSS(join(ROOT, 'tenants'), base);
    expect(tenants).toContain(slug);
    // The tenant's block: from its header comment to the next tenant's. The committed file is
    // prettier-formatted, so compare without whitespace and with one quote style.
    const squeeze = (t) => t.replace(/\s+/g, '').replace(/"/g, "'");
    const from = css.indexOf(`/* \u2500\u2500 ${slug} `);
    const next = css.indexOf('/* \u2500\u2500 ', from + 1);
    const block = css.slice(css.indexOf('\n', from), next === -1 ? undefined : next);
    expect(squeeze(read('src/styles/tenants.css'))).toContain(squeeze(block));
  });

  it('has a README that lists its gaps', () => {
    const readme = read(`${dir}/README.md`);
    expect(readme).toMatch(/^## Gaps/m);
    expect(readme).toMatch(/demo/i);
  });
});

describe('accent-pair-demo: the supporting accent is an overlay, not a token', () => {
  it('ships the overlay beside the tokens and does not touch the base tokens', () => {
    expect(existsSync(join(ROOT, 'tenants/accent-pair-demo/support-overlay.css'))).toBe(true);
    const flat = JSON.stringify(base);
    expect(flat).not.toMatch(/accent-?support|accentSupport/i);
  });

  it('declares only supporting-accent variables, and only inside the tenant scope', () => {
    const css = read('tenants/accent-pair-demo/support-overlay.css');
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    expect(rules.length).toBeGreaterThanOrEqual(2); // light, dark
    for (const [, selector, body] of rules) {
      expect(selector).toContain(`[data-brand='accent-pair-demo']`);
      for (const decl of body.split(';').filter((d) => d.trim())) {
        expect(decl.trim()).toMatch(
          /^--semantic-accent-support-[a-zA-Z]+:\s*var\(--primitive-color-[a-z]+-[a-z0-9]+\)$/,
        );
      }
    }
  });

  it('names the token it would need and how to promote it', () => {
    const readme = read('tenants/accent-pair-demo/README.md');
    expect(readme).toContain('support-overlay.css');
    expect(readme).toContain('semantic.accent.support');
  });
});

// ── The computed values, in Chromium ─────────────────────────────────────────

const CHROMIUM = chromiumPath() ?? chromium.executablePath();
const hasBrowser = Boolean(CHROMIUM) && existsSync(CHROMIUM);

// theme.css pulls in Tailwind first; the browser skips what it cannot parse and
// the custom properties this reads are plain CSS. The overlay is loaded the way
// a consumer must load it: after the tokens, as plain CSS.
const PAGE_CSS = [
  read('src/styles/tokens.generated.css'),
  read('src/styles/tenants.css'),
  read('src/styles/theme.css').replace(/^@(import|config)[^;]*;/gm, ''),
  read('tenants/accent-pair-demo/support-overlay.css'),
].join('\n');

/** A primitive colour as the browser prints it: `rgb(r, g, b)`. */
function rgb(path) {
  const hex = path.split('.').reduce((n, k) => n?.[k], base.primitive.color).$value;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}
const channels = (c) =>
  c
    .match(/\d+(\.\d+)?/g)
    .slice(0, 3)
    .map(Number);
const luminance = (c) => {
  const [r, g, b] = channels(c)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const px = (v) => parseFloat(v);

/** What each probe sets and which computed property it reads back. */
const PROBES = {
  radiusAction: ['border-radius:var(--role-radius)', 'borderTopLeftRadius'],
  radiusContainer: [
    `border-radius:${tailwind.theme.extend.borderRadius.lg}`,
    'borderTopLeftRadius',
  ],
  radiusNested: [`border-radius:${tailwind.theme.extend.borderRadius.sm}`, 'borderTopLeftRadius'],
  surfacePadding: ['padding-top:var(--semantic-space-surface-padding)', 'paddingTop'],
  surfacePaddingAlias: ['padding-top:var(--semantic-space-component-padding)', 'paddingTop'],
  raised: ['background-color:var(--semantic-color-surface-raised)', 'backgroundColor'],
  roleCard: ['background-color:var(--role-card)', 'backgroundColor'],
  page: ['background-color:var(--semantic-color-surface-page)', 'backgroundColor'],
  accentFill: ['background-color:var(--semantic-color-surface-accent)', 'backgroundColor'],
  accentRest: ['color:var(--semantic-accent-rest)', 'color'],
  onAccent: ['color:var(--semantic-color-content-onAccent)', 'color'],
  rolePrimary: ['background-color:var(--role-primary)', 'backgroundColor'],
  roleRing: ['border:1px solid var(--role-ring);', 'borderTopColor'],
  accentSubtle: ['background-color:var(--semantic-color-surface-accentSubtle)', 'backgroundColor'],
  supportRest: ['background-color:var(--semantic-accent-support-rest)', 'backgroundColor'],
  supportHover: ['background-color:var(--semantic-accent-support-hover)', 'backgroundColor'],
  supportPressed: ['background-color:var(--semantic-accent-support-pressed)', 'backgroundColor'],
  supportSubtle: ['background-color:var(--semantic-accent-support-subtle)', 'backgroundColor'],
  supportContent: ['color:var(--semantic-accent-support-content)', 'color'],
  supportOn: ['color:var(--semantic-accent-support-on)', 'color'],
};

let browser;
let page;
beforeAll(async () => {
  if (!hasBrowser) return;
  browser = await chromium.launch({ executablePath: CHROMIUM });
  page = await browser.newPage();
}, 120_000);
afterAll(async () => {
  await browser?.close();
});

/**
 * Renders the real stylesheets with the attributes on <html> or on a nested
 * element and returns every probe's computed value.
 */
async function measure({ brand = '', theme = 'light', density = 'comfortable', scope = 'html' }) {
  const attrs = [
    brand && `data-brand="${brand}"`,
    `data-theme="${theme}"`,
    density === 'compact' && 'data-density="compact"',
  ]
    .filter(Boolean)
    .join(' ');
  const body = scope === 'html' ? '<i id="p"></i>' : `<div ${attrs}><i id="p"></i></div>`;
  await page.setContent(
    `<html ${scope === 'html' ? attrs : ''}><head><style>${PAGE_CSS}</style></head><body>${body}</body></html>`,
  );
  return page.evaluate((probes) => {
    const el = document.getElementById('p');
    const out = {};
    for (const [name, [css, prop]] of Object.entries(probes)) {
      el.style.cssText = css;
      out[name] = getComputedStyle(el)[prop];
    }
    return out;
  }, PROBES);
}

const SCOPES = ['html', 'nested'];
const THEMES = ['light', 'dark'];
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

describe.skipIf(!hasBrowser)('soft-demo: computed, light and dark, on <html> and nested', () => {
  const cells = SCOPES.flatMap((scope) => THEMES.map((theme) => ({ scope, theme })));

  it.each(cells)(
    'actions are a pill, containers soft ($scope, $theme)',
    async ({ scope, theme }) => {
      const soft = await measure({ brand: 'soft-demo', theme, scope });
      const dflt = await measure({ theme, scope });

      // The default stays the 8 / 12 / 6 px it is today.
      expect([dflt.radiusAction, dflt.radiusContainer, dflt.radiusNested]).toEqual([
        '8px',
        '12px',
        '6px',
      ]);

      // 20px is half of the 40px default control (primitive.space.10, Button md / Input md), so a
      // control is a full pill; containers sit one step above (+4) and nested chrome one below (-2).
      const control = base.primitive.space['10'].$value.value;
      expect(px(soft.radiusAction)).toBeGreaterThanOrEqual(control / 2);
      expect([soft.radiusAction, soft.radiusContainer, soft.radiusNested]).toEqual([
        '20px',
        '24px',
        '18px',
      ]);
    },
  );

  it.each(cells)(
    'grey-fill grouping: raised surface and the card role ($scope, $theme)',
    async ({ scope, theme }) => {
      const soft = await measure({ brand: 'soft-demo', theme, scope });
      const dflt = await measure({ theme, scope });
      const expected = theme === 'light' ? rgb('neutral.100') : rgb('neutral.850');

      expect(soft.raised).toBe(expected);
      expect(soft.roleCard).toBe(expected); // the role alias follows the override, nested too
      // Light gets the visible fill (neutral.100, was neutral.50); dark is already a fill and is left alone.
      expect(dflt.raised).toBe(theme === 'light' ? rgb('neutral.50') : rgb('neutral.850'));
      expect(soft.raised).not.toBe(soft.page);
    },
  );

  it.each(SCOPES)('surfaces get room: 32px comfortable, 20px compact ($scope)', async (scope) => {
    const comfortable = await measure({ brand: 'soft-demo', scope });
    const compact = await measure({ brand: 'soft-demo', scope, density: 'compact' });
    expect([comfortable.surfacePadding, comfortable.surfacePaddingAlias]).toEqual(['32px', '32px']);
    expect([compact.surfacePadding, compact.surfacePaddingAlias]).toEqual(['20px', '20px']);
    expect((await measure({ scope })).surfacePadding).toBe('24px'); // default, unchanged
  });

  it.each(cells)('does not touch the accent ($scope, $theme)', async ({ scope, theme }) => {
    const soft = await measure({ brand: 'soft-demo', theme, scope });
    const dflt = await measure({ theme, scope });
    for (const k of ['accentFill', 'accentRest', 'onAccent', 'rolePrimary', 'roleRing']) {
      expect(soft[k], k).toBe(dflt[k]);
    }
  });
});

describe.skipIf(!hasBrowser)(
  'accent-pair-demo: computed, light and dark, on <html> and nested',
  () => {
    const cells = SCOPES.flatMap((scope) => THEMES.map((theme) => ({ scope, theme })));
    // Same shape as the base accent (a dark fill in light, a light fill in dark), in plum.
    const PRIMARY = {
      light: { fill: 'mauve.600', subtle: 'mauve.50' },
      dark: { fill: 'mauve.300', subtle: 'mauve.900' },
    };
    // The supporting accent is sand/bronze: a fill that carries white (or deep brown) text, a tint, a text colour.
    const SUPPORT = {
      light: {
        rest: 'stone.600',
        hover: 'stone.700',
        pressed: 'stone.800',
        subtle: 'stone.100',
        content: 'stone.700',
        on: 'neutral.white',
      },
      dark: {
        rest: 'stone.400',
        hover: 'stone.450',
        pressed: 'stone.500',
        subtle: 'stone.950',
        content: 'stone.400',
        on: 'stone.950',
      },
    };

    it.each(cells)(
      'primary accent resolves for every consumer of it ($scope, $theme)',
      async ({ scope, theme }) => {
        const m = await measure({ brand: 'accent-pair-demo', theme, scope });
        const want = PRIMARY[theme];
        expect(m.accentFill).toBe(rgb(want.fill));
        expect(m.accentRest).toBe(rgb(want.fill));
        expect(m.rolePrimary).toBe(rgb(want.fill)); // what Button's bg-primary reads
        expect(m.roleRing).toBe(rgb(want.fill)); // what the focus ring reads
        expect(m.accentSubtle).toBe(rgb(want.subtle));
      },
    );

    it.each(cells)(
      'supporting accent resolves to the intended primitives ($scope, $theme)',
      async ({ scope, theme }) => {
        const m = await measure({ brand: 'accent-pair-demo', theme, scope });
        const want = SUPPORT[theme];
        expect({
          rest: m.supportRest,
          hover: m.supportHover,
          pressed: m.supportPressed,
          subtle: m.supportSubtle,
          content: m.supportContent,
          on: m.supportOn,
        }).toEqual(Object.fromEntries(Object.entries(want).map(([k, v]) => [k, rgb(v)])));
      },
    );

    it.each(cells)(
      'the pair is two colours, not one ($scope, $theme)',
      async ({ scope, theme }) => {
        const m = await measure({ brand: 'accent-pair-demo', theme, scope });
        expect(m.accentFill).not.toBe(m.supportRest);
      },
    );

    it.each(cells)(
      'primary clears AA for text on its fill ($scope, $theme)',
      async ({ scope, theme }) => {
        const m = await measure({ brand: 'accent-pair-demo', theme, scope });
        expect(contrast(m.onAccent, m.accentFill)).toBeGreaterThanOrEqual(4.5);
      },
    );

    it.each(cells)(
      'supporting accent clears AA where it carries text, 3:1 as a boundary ($scope, $theme)',
      async ({ scope, theme }) => {
        const m = await measure({ brand: 'accent-pair-demo', theme, scope });
        expect(contrast(m.supportOn, m.supportRest)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(m.supportOn, m.supportHover)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(m.supportContent, m.page)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(m.supportContent, m.supportSubtle)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(m.supportRest, m.page)).toBeGreaterThanOrEqual(3);
      },
    );

    it('is scoped: the supporting variables do not exist outside the tenant', async () => {
      for (const brand of ['', 'soft-demo', 'accent-lilac', 'brutalist-demo']) {
        const m = await measure({ brand });
        expect(m.supportRest, brand || 'default').toBe(TRANSPARENT);
        expect(m.supportContent, brand || 'default').not.toBe(rgb('stone.700'));
      }
    });

    it('data-tenant, the supported alias of data-brand, scopes the overlay too', async () => {
      await page.setContent(
        `<html data-tenant="accent-pair-demo"><head><style>${PAGE_CSS}</style></head><body><i id="p"></i></body></html>`,
      );
      const rest = await page.evaluate(() => {
        const el = document.getElementById('p');
        el.style.cssText = 'background-color:var(--semantic-accent-support-rest)';
        return getComputedStyle(el).backgroundColor;
      });
      expect(rest).toBe(rgb('stone.600'));
    });
  },
);

describe.skipIf(!hasBrowser)(
  'side by side: default, soft-demo and accent-pair-demo in one page',
  () => {
    it('each column resolves its own values at the same time', async () => {
      const brands = ['', 'soft-demo', 'accent-pair-demo'];
      const columns = brands
        .map(
          (b, i) =>
            `<div id="c${i}" ${b ? `data-brand="${b}"` : ''} data-theme="light"><i></i></div>`,
        )
        .join('');
      await page.setContent(
        `<html><head><style>${PAGE_CSS}</style></head><body>${columns}</body></html>`,
      );
      const rows = await page.evaluate(
        ({ probes, count }) =>
          Array.from({ length: count }, (_, i) => {
            const el = document.querySelector(`#c${i} i`);
            const out = {};
            for (const [name, [css, prop]] of Object.entries(probes)) {
              el.style.cssText = css;
              out[name] = getComputedStyle(el)[prop];
            }
            return out;
          }),
        { probes: PROBES, count: brands.length },
      );
      const [dflt, soft, pair] = rows;

      expect(dflt.radiusAction).toBe('8px');
      expect(soft.radiusAction).toBe('20px');
      expect(pair.radiusAction).toBe('8px'); // the pair changes colour, not shape
      expect(soft.raised).toBe(rgb('neutral.100'));
      expect(dflt.raised).toBe(rgb('neutral.50'));
      expect(pair.accentFill).toBe(rgb('mauve.600'));
      expect(pair.supportRest).toBe(rgb('stone.600'));
      expect(dflt.supportRest).toBe(TRANSPARENT);
      expect(soft.supportRest).toBe(TRANSPARENT);
      // Three different looks from one stylesheet.
      expect(new Set(rows.map((r) => `${r.radiusAction}|${r.raised}|${r.accentFill}`)).size).toBe(
        3,
      );
    });
  },
);
