/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#393 step 1: Grid can render what TileGrid rendered, so TileGrid could
 * fold into it (0.20.0 removed TileGrid, hds#395). `<Grid layout="auto-fill" minItemWidth="220px" gap="medium">`
 * must compute the same tracks and the same 12px gap as
 * `<TileGrid minTileWidth="220px">` (gap 'sm', its default), under every
 * tenant and density, at every viewport width the spacing lock uses, and in a
 * container narrower than one tile.
 *
 * hds#395 (B5): the same proof for what codemods/tile-grid.mjs writes. Each
 * TileGrid tag ops origin/main renders (76ef65e: ClientDashboardPage.tsx 6,
 * agentic-os/SurfacesRail.tsx 1) and TileGrid's bare defaults go through the
 * codemod, and the Grid it writes is compared with TileGrid's rendered style.
 * fixtures/tile-grid-0.19.json pins that style per tag: it was checked against
 * the live TileGrid up to the commit that removed it, and stands in for it since.
 *
 * This is a test of its own, not probes in spacing-computed-lock.test.mjs:
 * that lock pins every probe to a fixture captured from 8e53a8a, where
 * `auto-fill`, `minItemWidth` and `medium` did not exist, so new options have
 * nothing to be locked to. The lock still covers every existing Grid option.
 *
 * The computed half needs Chromium (Playwright) and skips without it.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { chromiumPath } from '../lib/storybook-host.mjs';
import { transformSource } from '../../codemods/tile-grid.mjs';
import { Grid } from '../../src/app/components/grid.tsx';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** TileGrid's root style per tag, as 0.19.1 rendered it (hds#395). */
const PINNED = JSON.parse(read('scripts/__tests__/fixtures/tile-grid-0.19.json')).style;

/** The TileGrid tags ops renders, by attributes, and TileGrid's bare defaults (''). */
const SITES = [
  'minTileWidth="280px"', // ClientDashboardPage.tsx: lane tasks, workflows
  'minTileWidth="220px"', // ClientDashboardPage.tsx: systems
  'minTileWidth="260px"', // ClientDashboardPage.tsx: checklist, micro and macro goals
  'minTileWidth="260px" gap="sm"', // agentic-os/SurfacesRail.tsx
  '',
];

const tiles = () =>
  Array.from({ length: 7 }, (_, i) => React.createElement('i', { key: i, style: { height: 8 } }));

const attrsOf = (text) =>
  Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

/** The Grid props codemods/tile-grid.mjs writes for one TileGrid tag. */
function rewritten(attrs) {
  const out = transformSource(
    `import { TileGrid } from '@hirobius/design-system';\n<TileGrid${attrs ? ` ${attrs}` : ''}><i /></TileGrid>;\n`,
  );
  expect(out.manual).toEqual([]);
  return attrsOf(/<Grid\b([^>]*)>/.exec(out.source)[1]);
}

const grid = (props = { layout: 'auto-fill', minItemWidth: '220px', gap: 'medium' }) =>
  renderToStaticMarkup(React.createElement(Grid, props, tiles()));
/** TileGrid as it rendered, rebuilt from its pinned root style. */
const pinnedTileGrid = (attrs) =>
  `<div style="${PINNED[attrs]}">${renderToStaticMarkup(React.createElement(React.Fragment, null, tiles()))}</div>`;

/** The inline style a component writes on its root element. */
const rootStyle = (html) => /^<[a-z]+\b[^>]*?\sstyle="([^"]*)"/.exec(html)?.[1] ?? '(none)';
const template = (style) => /grid-template-columns:([^;]*)/.exec(style)?.[1];

describe("Grid renders TileGrid's recipe (hds#393)", () => {
  it('emits the same track template as TileGrid', () => {
    expect(template(rootStyle(grid()))).toBe('repeat(auto-fill, minmax(min(220px, 100%), 1fr))');
    expect(template(rootStyle(grid()))).toBe(template(PINNED['minTileWidth="220px"']));
  });
});

describe('the pinned TileGrid styles (hds#395)', () => {
  it("hold one entry per ops site, each TileGrid's recipe: its width (260px by default) on a 12px gap", () => {
    expect(Object.keys(PINNED).sort()).toEqual([...SITES].sort());
    for (const attrs of SITES) {
      const width = attrsOf(attrs).minTileWidth ?? '260px';
      expect(PINNED[attrs], attrs).toBe(
        `display:grid;grid-template-columns:repeat(auto-fill, minmax(min(${width}, 100%), 1fr));gap:12px`,
      );
    }
  });
});

describe("codemods/tile-grid.mjs writes TileGrid's recipe for every ops site (hds#395)", () => {
  it.each(SITES)('<TileGrid %s> keeps its tracks and its 12px gap', (attrs) => {
    const props = rewritten(attrs);
    expect(props).toMatchObject({ layout: 'auto-fill', gap: 'medium' });
    expect(template(rootStyle(grid(props)))).toBe(template(PINNED[attrs]));
    expect(PINNED[attrs]).toMatch(/gap:12px/);
    expect(rootStyle(grid(props))).toMatch(/gap:var\(--semantic-space-component-medium\)/);
  });
});

// ── Computed, in Chromium ─────────────────────────────────────────────────────

const TENANTS = ['base', 'accent-lilac', 'brutalist-demo', 'concrete-creations'];
const DENSITIES = ['comfortable', 'compact'];
/** The spacing lock's widths; theme.css retunes spacing at 639/640px. */
const WIDTHS = [1280, 640, 639, 400];
/** A full-width container, and one narrower than a 220px tile. */
const CONTAINERS = ['100%', '180px'];

const PAGE_CSS = [
  read('src/styles/tokens.generated.css'),
  read('src/styles/tenants.css'),
  read('src/styles/theme.css').replace(/^@(import|config)[^;]*;/gm, ''),
].join('\n');

/** One pair per probe: TileGrid's markup and the Grid that replaces it. */
const PROBES = [
  { id: 'b3', tileGrid: pinnedTileGrid('minTileWidth="220px"'), grid: grid() },
  ...SITES.map((attrs, i) => ({
    id: `site${i}`,
    tileGrid: pinnedTileGrid(attrs),
    grid: grid(rewritten(attrs)),
  })),
];

function pageHtml(tenant, density) {
  const brand = tenant === 'base' ? '' : `data-brand="${tenant}"`;
  const dens = density === 'compact' ? 'data-density="compact"' : '';
  const pair = (probe, width, i) =>
    `<div id="t-${probe.id}-${i}" style="width:${width}">${probe.tileGrid}</div>` +
    `<div id="g-${probe.id}-${i}" style="width:${width}">${probe.grid}</div>`;
  const body = PROBES.flatMap((probe) => CONTAINERS.map((w, i) => pair(probe, w, i))).join('');
  return `<html ${brand} ${dens}><head><style>${PAGE_CSS}</style></head><body>${body}</body></html>`;
}

const CHROMIUM = chromiumPath() ?? chromium.executablePath();
const hasBrowser = Boolean(CHROMIUM) && existsSync(CHROMIUM);

describe.skipIf(!hasBrowser)(
  'Grid computes what TileGrid computes, in Chromium (hds#393, hds#395)',
  () => {
    /** One row per probe x tenant x density x width x container. */
    const rows = [];

    beforeAll(async () => {
      const browser = await chromium.launch({ executablePath: CHROMIUM });
      try {
        const page = await browser.newPage();
        for (const tenant of TENANTS) {
          for (const density of DENSITIES) {
            await page.setContent(pageHtml(tenant, density));
            for (const width of WIDTHS) {
              await page.setViewportSize({ width, height: 600 });
              const measured = await page.evaluate(
                ({ ids, count }) => {
                  const read = (id) => {
                    const s = getComputedStyle(document.getElementById(id).firstElementChild);
                    return {
                      tracks: s.gridTemplateColumns,
                      rowGap: s.rowGap,
                      columnGap: s.columnGap,
                    };
                  };
                  return ids.flatMap((probe) =>
                    Array.from({ length: count }, (_, i) => ({
                      probe,
                      i,
                      tileGrid: read(`t-${probe}-${i}`),
                      grid: read(`g-${probe}-${i}`),
                    })),
                  );
                },
                { ids: PROBES.map((p) => p.id), count: CONTAINERS.length },
              );
              for (const m of measured)
                rows.push({
                  cell: `${m.probe}|${tenant}|${density}|${width}|${CONTAINERS[m.i]}`,
                  tileGrid: m.tileGrid,
                  grid: m.grid,
                });
            }
          }
        }
      } finally {
        await browser.close();
      }
    }, 120_000);

    it('measures every probe x tenant x density x width x container', () => {
      expect(rows).toHaveLength(
        PROBES.length * TENANTS.length * DENSITIES.length * WIDTHS.length * CONTAINERS.length,
      );
    });

    it('lays out the same tracks as TileGrid in every cell', () => {
      const diffs = rows
        .filter((r) => r.grid.tracks !== r.tileGrid.tracks)
        .map((r) => `${r.cell}: TileGrid ${r.tileGrid.tracks} / Grid ${r.grid.tracks}`);
      expect(diffs).toEqual([]);
    });

    it("gaps 12px in every cell, TileGrid's default: compact density does not remap it", () => {
      const gaps = new Set(rows.flatMap((r) => [r.grid.rowGap, r.grid.columnGap]));
      expect([...gaps]).toEqual(['12px']);
      const tileGaps = new Set(rows.flatMap((r) => [r.tileGrid.rowGap, r.tileGrid.columnGap]));
      expect([...tileGaps]).toEqual(['12px']);
    });

    it('collapses to one full-width track in a container narrower than a tile', () => {
      const narrow = rows.filter((r) => r.cell.endsWith('|180px'));
      expect(narrow.length).toBeGreaterThan(0);
      for (const r of narrow) expect(r.grid.tracks).toBe('180px');
    });
  },
);
