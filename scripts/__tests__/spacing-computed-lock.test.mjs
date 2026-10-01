/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#206 fix round: a patch must not move any consumer's spacing.
 *
 * Every Box `sx` spacing value and every Stack `gap` option is rendered here
 * and compared against a fixture captured from c506c3b, the commit before the
 * hds#206 finish:
 *
 *   - `emitted`: the CSS the resolver writes (Box's rule, Stack's inline gap).
 *     No browser needed, so this half runs everywhere, CI included.
 *   - `computed`: the pixels Chromium computes from that CSS and the real
 *     stylesheets, for every tenant x density x scope x viewport width. Skips
 *     where Playwright has no Chromium.
 *
 * Box `sx` takes the t-shirt names 'xs'..'xl' from this release on. On c506c3b
 * they passed through as invalid CSS and rendered no spacing, which the
 * fixture records; here they must match the scale steps Stack already used.
 * That addition is the only difference from c506c3b this test allows.
 *
 * Recapture only from a tree of c506c3b, never from a later commit (the point
 * is the old values):
 *   git archive c506c3b | tar -x -C <dir>; copy this file into <dir>/scripts/__tests__/;
 *   HDS_CAPTURE_SPACING_LOCK=1 pnpm exec vitest run scripts/__tests__/spacing-computed-lock.test.mjs
 *   then copy <dir>/scripts/__tests__/fixtures/spacing-computed-lock/c506c3b.json back.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { chromiumPath } from '../lib/storybook-host.mjs';
import { resolveSx } from '../../src/app/components/box-sx.ts';
import { Stack } from '../../src/app/components/stack.tsx';
import hds from '../../src/app/design-system/tokens.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const FIXTURE = join(ROOT, 'scripts/__tests__/fixtures/spacing-computed-lock/c506c3b.json');
const CAPTURE = process.env.HDS_CAPTURE_SPACING_LOCK === '1';

// ── What is probed ────────────────────────────────────────────────────────────

/** Box sx names that existed on c506c3b. */
const BOX_LEGACY_NAMES = ['tight', 'normal', 'inset', 'spacious'];
/** Box sx names added by hds#206: invalid CSS on c506c3b. */
const BOX_ADDED_NAMES = ['xs', 'sm', 'md', 'lg', 'xl'];
/** Numbers are a count of 4px units, on the primitive scale or off it. */
const BOX_NUMBERS = [0, 1, 2, 3, 4, 6, 8, 9, 12, 16, 32];

/** Every value Stack's `gap` type accepts. */
const STACK_TYPED = [
  'tight',
  'normal',
  'inset',
  'spacious',
  'gap',
  'medium',
  'hairline',
  'xs',
  'stack',
  ...Object.keys(hds.space),
];
/** Values Stack's type rejects but a JavaScript caller can still pass. */
const STACK_UNTYPED = [0, 4, 12, 'sm', 'md', 'xl', '1rem'];

/** The Stack gap name that reads each t-shirt step (an added Box name must match it). */
const STACK_NAME_FOR_STEP = { xs: 'gap', sm: 'tight', md: 'normal', lg: 'inset', xl: 'spacious' };

/**
 * One probe per value. `box` probes apply a Box sx object through resolveSx,
 * the function Box's injected rule comes from; `stack` probes render Stack.
 */
const PROBES = [];
for (const prop of ['p', 'gap']) {
  for (const v of [...BOX_LEGACY_NAMES, ...BOX_ADDED_NAMES, ...BOX_NUMBERS]) {
    PROBES.push({ key: `box ${prop} ${v}`, kind: 'box', prop, sx: { [prop]: v } });
  }
  PROBES.push({
    key: `box ${prop} {xs:tight,md:spacious}`,
    kind: 'box',
    prop,
    sx: { [prop]: { xs: 'tight', md: 'spacious' } },
  });
}
for (const v of [...STACK_TYPED, ...STACK_UNTYPED]) {
  PROBES.push({ key: `stack gap ${typeof v === 'number' ? `#${v}` : v}`, kind: 'stack', gap: v });
}
const ADDED = new Set(
  PROBES.filter((p) => p.kind === 'box' && BOX_ADDED_NAMES.includes(p.sx[p.prop])).map(
    (p) => p.key,
  ),
);

/** The CSS each probe emits, as the page will receive it. */
function emit(probe, index) {
  if (probe.kind === 'box') return resolveSx(probe.sx, `bx${index}`).join('\n');
  const html = renderToStaticMarkup(
    React.createElement(Stack, { gap: probe.gap }, React.createElement('i')),
  );
  const gap = /style="[^"]*?\bgap:([^;"]*)/.exec(html);
  return gap ? gap[1] : '(none)';
}

const emitted = Object.fromEntries(PROBES.map((p, i) => [p.key, emit(p, i)]));

// ── The cells ─────────────────────────────────────────────────────────────────

const TENANTS = ['base', 'accent-lilac', 'brutalist-demo', 'concrete-creations'];
const DENSITIES = ['comfortable', 'compact'];
/**
 * Where the attributes sit. A var() resolves where it is declared, so the
 * brand and the density on <html>, on a nested element, split between the two,
 * and the data-tenant spelling of the brand can each compute differently.
 */
const SCOPES = ['html', 'nested', 'split', 'tenant'];
/** theme.css retunes spacing at 639/640px; Box's responsive maps switch at 375 and 768. */
const WIDTHS = [1280, 640, 639, 400];

const CELLS = [];
for (const tenant of TENANTS) {
  for (const density of DENSITIES) {
    for (const scope of SCOPES) {
      for (const width of WIDTHS) CELLS.push({ tenant, density, scope, width });
    }
  }
}
const cellKey = (c) => `${c.tenant}|${c.density}|${c.scope}|${c.width}`;

function pageHtml(tenant, density, scope, css) {
  const brand = tenant === 'base' ? '' : `data-brand="${tenant}"`;
  const tenantAttr = tenant === 'base' ? '' : `data-tenant="${tenant}"`;
  const dens = density === 'compact' ? 'data-density="compact"' : '';
  const [htmlAttrs, wrapAttrs] = {
    html: [`${brand} ${dens}`, ''],
    nested: ['', `${brand} ${dens}`],
    split: [dens, brand],
    tenant: [`${tenantAttr} ${dens}`, ''],
  }[scope];
  const probes = PROBES.map((p, i) =>
    p.kind === 'box'
      ? `<div id="p${i}" class="bx${i}" style="display:flex"></div>`
      : `<div id="p${i}">${renderToStaticMarkup(
          React.createElement(Stack, { gap: p.gap }, React.createElement('i')),
        )}</div>`,
  ).join('');
  const boxRules = PROBES.map((p) => (p.kind === 'box' ? emitted[p.key] : '')).join('\n');
  return `<html ${htmlAttrs}><head><style>${css}</style><style>${boxRules}</style></head><body><div ${wrapAttrs}>${probes}</div></body></html>`;
}

// theme.css pulls in Tailwind first; the browser skips what it cannot parse, and
// the custom properties this reads are plain CSS.
const PAGE_CSS = [
  read('src/styles/tokens.generated.css'),
  read('src/styles/tenants.css'),
  read('src/styles/theme.css').replace(/^@(import|config)[^;]*;/gm, ''),
].join('\n');

const CHROMIUM = chromiumPath() ?? chromium.executablePath();
const hasBrowser = Boolean(CHROMIUM) && existsSync(CHROMIUM);

async function measureAll() {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  try {
    const page = await browser.newPage();
    const byCell = {};
    for (const tenant of TENANTS) {
      for (const density of DENSITIES) {
        for (const scope of SCOPES) {
          await page.setContent(pageHtml(tenant, density, scope, PAGE_CSS));
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 600 });
            byCell[cellKey({ tenant, density, scope, width })] = await page.evaluate(
              (probes) =>
                probes.map(({ kind, prop }, i) => {
                  const host = document.getElementById(`p${i}`);
                  const el = kind === 'box' ? host : host.firstElementChild;
                  const s = getComputedStyle(el);
                  return kind === 'box' && prop === 'p' ? s.paddingTop : s.rowGap;
                }),
              PROBES.map(({ kind, prop }) => ({ kind, prop })),
            );
          }
        }
      }
    }
    // Probe-major: one space-separated string per probe, one value per cell.
    return Object.fromEntries(
      PROBES.map((p, i) => [p.key, CELLS.map((c) => byCell[cellKey(c)][i]).join(' ')]),
    );
  } finally {
    await browser.close();
  }
}

// ── Capture (run only in a tree of c506c3b) ───────────────────────────────────

describe.runIf(CAPTURE)('capture the spacing lock fixture', () => {
  it('writes the fixture', async () => {
    const computed = await measureAll();
    mkdirSync(dirname(FIXTURE), { recursive: true });
    writeFileSync(
      FIXTURE,
      `${JSON.stringify(
        {
          capturedFrom: 'c506c3b',
          cells: CELLS.map(cellKey),
          emitted,
          computed,
        },
        null,
        2,
      )}\n`,
    );
  }, 120_000);
});

// ── The lock ──────────────────────────────────────────────────────────────────

describe.skipIf(CAPTURE)('spacing matches c506c3b', () => {
  const fixture = existsSync(FIXTURE)
    ? JSON.parse(readFileSync(FIXTURE, 'utf8'))
    : { cells: [], emitted: {}, computed: {} };

  it('probes the same values and cells the fixture recorded', () => {
    expect(existsSync(FIXTURE)).toBe(true);
    expect(Object.keys(fixture.emitted).sort()).toEqual(PROBES.map((p) => p.key).sort());
    expect(fixture.cells).toEqual(CELLS.map(cellKey));
  });

  it.each(PROBES.filter((p) => !ADDED.has(p.key)).map((p) => p.key))(
    '%s emits the CSS it emitted on c506c3b',
    (key) => {
      expect(emitted[key]).toBe(fixture.emitted[key]);
    },
  );

  it('the added Box names were invalid CSS on c506c3b', () => {
    for (const key of ADDED) {
      const [, prop, name] = key.split(' ');
      const decl = prop === 'p' ? 'padding' : 'gap';
      expect(fixture.emitted[key]).toMatch(new RegExp(`\\{${decl}:${name}\\}$`));
    }
  });

  describe.skipIf(!hasBrowser)('computed, every tenant x density x scope x width', () => {
    let computed;
    beforeAll(async () => {
      computed = await measureAll();
    }, 120_000);

    it.each(PROBES.filter((p) => !ADDED.has(p.key)).map((p) => p.key))(
      '%s computes what it computed on c506c3b',
      (key) => {
        const want = fixture.computed[key].split(' ');
        const got = computed[key].split(' ');
        const diffs = fixture.cells
          .map((cell, i) => (want[i] === got[i] ? null : `${cell}: ${want[i]} -> ${got[i]}`))
          .filter(Boolean);
        expect(diffs).toEqual([]);
      },
    );

    it.each(BOX_ADDED_NAMES)(
      'Box sx %s computed no spacing on c506c3b and now matches its Stack step',
      (step) => {
        for (const prop of ['p', 'gap']) {
          const key = `box ${prop} ${step}`;
          const empty = prop === 'p' ? '0px' : 'normal';
          expect(new Set(fixture.computed[key].split(' '))).toEqual(new Set([empty]));
          expect(computed[key]).toBe(computed[`stack gap ${STACK_NAME_FOR_STEP[step]}`]);
        }
      },
    );
  });
});
