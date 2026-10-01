/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#393 step 1: Grid can render what TileGrid renders, so TileGrid can
 * fold into it. `<Grid layout="auto-fill" minItemWidth="220px" gap="medium">`
 * must compute the same tracks and the same 12px gap as
 * `<TileGrid minTileWidth="220px">` (gap 'sm', its default), under every
 * tenant and density, at every viewport width the spacing lock uses, and in a
 * container narrower than one tile.
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
import { Grid } from '../../src/app/components/grid.tsx';
import { TileGrid } from '../../src/app/components/tile-grid.tsx';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const tiles = () =>
  Array.from({ length: 7 }, (_, i) => React.createElement('i', { key: i, style: { height: 8 } }));

const tileGrid = () =>
  renderToStaticMarkup(React.createElement(TileGrid, { minTileWidth: '220px' }, tiles()));
const grid = () =>
  renderToStaticMarkup(
    React.createElement(
      Grid,
      { layout: 'auto-fill', minItemWidth: '220px', gap: 'medium' },
      tiles(),
    ),
  );

/** The inline style a component writes on its root element. */
const rootStyle = (html) => /^<[a-z]+\b[^>]*?\sstyle="([^"]*)"/.exec(html)?.[1] ?? '(none)';

describe("Grid renders TileGrid's recipe (hds#393)", () => {
  it('emits the same track template as TileGrid', () => {
    const template = /grid-template-columns:([^;]*)/;
    expect(template.exec(rootStyle(grid()))?.[1]).toBe(
      'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
    );
    expect(template.exec(rootStyle(grid()))?.[1]).toBe(template.exec(rootStyle(tileGrid()))?.[1]);
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

function pageHtml(tenant, density) {
  const brand = tenant === 'base' ? '' : `data-brand="${tenant}"`;
  const dens = density === 'compact' ? 'data-density="compact"' : '';
  const pair = (width, i) =>
    `<div id="t${i}" style="width:${width}">${tileGrid()}</div>` +
    `<div id="g${i}" style="width:${width}">${grid()}</div>`;
  return `<html ${brand} ${dens}><head><style>${PAGE_CSS}</style></head><body>${CONTAINERS.map(pair).join('')}</body></html>`;
}

const CHROMIUM = chromiumPath() ?? chromium.executablePath();
const hasBrowser = Boolean(CHROMIUM) && existsSync(CHROMIUM);

describe.skipIf(!hasBrowser)('Grid computes what TileGrid computes, in Chromium (hds#393)', () => {
  /** One row per tenant x density x width x container. */
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
            const measured = await page.evaluate((count) => {
              const read = (id) => {
                const s = getComputedStyle(document.getElementById(id).firstElementChild);
                return {
                  tracks: s.gridTemplateColumns,
                  rowGap: s.rowGap,
                  columnGap: s.columnGap,
                };
              };
              return Array.from({ length: count }, (_, i) => ({
                tileGrid: read(`t${i}`),
                grid: read(`g${i}`),
              }));
            }, CONTAINERS.length);
            measured.forEach((m, i) =>
              rows.push({ cell: `${tenant}|${density}|${width}|${CONTAINERS[i]}`, ...m }),
            );
          }
        }
      }
    } finally {
      await browser.close();
    }
  }, 120_000);

  it('measures every tenant x density x width x container', () => {
    expect(rows).toHaveLength(TENANTS.length * DENSITIES.length * WIDTHS.length * 2);
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
});
