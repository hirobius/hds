/**
 * Surface and elevation on real components (Adrian, doc pages Draft 2, 2026-11-06):
 * each elevation level and each surface step is shown on the live HDS components that
 * use it, next to its plain square swatch. Overlays open from a real trigger; hover and
 * press states are the components' own (no drawn stand-ins).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FoundationVisual } from '../../docs-site/components/foundation-visuals';

const rowsOf = (html: string, section: string) => {
  const start = html.indexOf(`data-section="${section}"`);
  expect(start, section).toBeGreaterThan(-1);
  const end = html.indexOf('data-section=', start + 1);
  return html.slice(start, end === -1 ? undefined : end);
};
const rowTokens = (block: string) => [...block.matchAll(/data-token="([^"]+)"/g)].map((m) => m[1]);

describe('Elevation on components', () => {
  const block = rowsOf(
    renderToStaticMarkup(<FoundationVisual page="elevation" />),
    'elevation-on-components',
  );

  it('has one row per level plus the hard shadow, in order', () => {
    expect(rowTokens(block)).toEqual([
      'semantic.elevation.flat',
      'semantic.elevation.raised',
      'semantic.elevation.floating',
      'semantic.elevation.overlay',
      'semantic.color.shadow.hard',
    ]);
  });

  it('shows real components: a bordered Card, an interactive Card, overlay triggers and Buttons', () => {
    expect(block).toMatch(/Open menu/);
    expect(block).toMatch(/Open dialog/);
    expect(block).toMatch(/Open popover/);
    expect(block).toMatch(/<button[^>]*>[\s\S]*?Primary/);
    expect(block).toMatch(/<button[^>]*>[\s\S]*?Secondary/);
    expect((block.match(/<a [^>]*href="#elevation-on-components"/g) ?? []).length).toBe(1);
  });
});

describe('Surface steps on components', () => {
  const block = rowsOf(
    renderToStaticMarkup(<FoundationVisual page="soft-surfaces" />),
    'surface-on-components',
  );

  it('has a row for each surface step, each with Light and Dark squares', () => {
    const tokens = rowTokens(block);
    expect(tokens).toEqual([
      'semantic.color.surface.page',
      'semantic.color.surface.raised',
      'semantic.color.surface.muted',
      'semantic.color.surface.overlay',
      'semantic.color.surface.floating',
      'semantic.color.surface.sunken',
      'semantic.color.surface.soft',
      'semantic.color.surface.softHover',
      'semantic.color.surface.inverse',
    ]);
    const squares = block.match(/class="hds-swatch-squares"/g) ?? [];
    expect(squares.length).toBe(tokens.length);
    expect((block.match(/data-theme-mode="dark"/g) ?? []).length).toBe(tokens.length);
  });
});
