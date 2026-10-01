#!/usr/bin/env node
/**
 * tile-grid codemod (hds#395, hds#389's 2026-10-01 decision update)
 *
 * 0.20.0 removed TileGrid from the package root. Grid renders its recipe since
 * hds#393: `layout="auto-fill"` with `minItemWidth`, and the fixed 12px
 * `medium` gap step. TileGrid defaulted to 260px tiles on a 12px gap; Grid
 * defaults to 280px and 32px, so the rewrite always writes both:
 *
 *   <TileGrid minTileWidth="280px">            <Grid layout="auto-fill" minItemWidth="280px" gap="medium">
 *   <TileGrid minTileWidth="260px" gap="sm">   <Grid layout="auto-fill" minItemWidth="260px" gap="medium">
 *   <TileGrid>                                 <Grid layout="auto-fill" minItemWidth="260px" gap="medium">
 *
 * The rendered tracks and gap are the same under every tenant and density
 * (scripts/__tests__/grid-tile-grid-parity.test.mjs). An expression width keeps
 * TileGrid's fallback: `minTileWidth={w}` becomes `minItemWidth={w ?? '260px'}`.
 * Every other attribute, comment and line break stays, and the import names Grid
 * (an alias stays the file's name; a file that binds Grid to something else keeps
 * `Grid as TileGrid`; a file that already imports Grid reuses it).
 *
 * Left for a manual edit (codemods/jsx-fold.mjs): `gap="xs"` and `gap="md"`,
 * which were fixed 8px and 16px where Grid's nearest steps (`tight`, `normal`)
 * tighten under compact density; a gap or a spread the codemod cannot read; a
 * self-closing tag (Grid needs children); any use that is not a JSX tag; and
 * `TileGridProps`. Running it twice changes nothing.
 *
 *   node codemods/tile-grid.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 while a rewrite is needed or a site needs
 *                 a manual edit (a namespace or dynamic import that reads the
 *                 name, or a file that cannot be read to its end, included)
 *   --dry-run     write nothing; print each changed line before (-) and after (+), exit 0
 */
import { ROOT_PKG, foldComponent, insertionPoint, isEntry, main, runFold } from './jsx-fold.mjs';

/** TileGrid's default width, which Grid does not share. */
const TILE_WIDTH = '260px';

/** TileGrid's fixed gaps Grid has no fixed step for, and Grid's nearest density-aware one. */
const NO_STEP = {
  xs: '8px, and gap="tight" is 8px but 6px under compact density',
  md: '16px, and gap="normal" is 16px but 12px under compact density',
};

/** @type {import('./jsx-fold.mjs').FoldRule} */
export const RULE = Object.freeze({
  name: 'TileGrid',
  survivor: 'Grid',
  survivorFrom: ROOT_PKG,
  types: { TileGridProps: "GridProps: minTileWidth is minItemWidth, gap 'sm' is 'medium'" },
  rewrite(tag, source) {
    if (tag.selfClosing && !tag.attrs.some((a) => a.name === 'children'))
      return { manual: 'Grid needs children; rewrite it by hand' };
    if (tag.attrs.some((a) => a.kind === 'spread'))
      return { manual: 'a spread can carry minTileWidth or gap; rewrite it by hand' };
    const gap = tag.attrs.find((a) => a.name === 'gap');
    if (gap && !(gap.kind === 'string' && gap.value === 'sm')) {
      const text = source.slice(gap.start, gap.end);
      const why = gap.kind === 'string' && NO_STEP[gap.value];
      return {
        manual: why
          ? `${text}: TileGrid's gap was a fixed ${why}; rewrite it by hand`
          : `${text}: the codemod cannot read the gap; rewrite it by hand`,
      };
    }
    const width = tag.attrs.find((a) => a.name === 'minTileWidth');
    if (width && width.kind === 'bare')
      return { manual: 'minTileWidth has no value; rewrite it by hand' };
    const edits = [];
    if (gap) edits.push({ start: gap.valueStart + 1, end: gap.valueEnd - 1, text: 'medium' });
    if (width) {
      const { sep } = insertionPoint(source, tag, width);
      edits.push(
        { start: width.start, end: width.start, text: `layout="auto-fill"${sep}` },
        { start: width.start, end: width.start + 'minTileWidth'.length, text: 'minItemWidth' },
      );
      if (width.kind === 'expr') {
        const expr = width.value.trim();
        const operand = /^[\w$.]+$/.test(expr) ? expr : `(${expr})`;
        edits.push({
          start: width.valueStart,
          end: width.valueEnd,
          text: `{${operand} ?? '${TILE_WIDTH}'}`,
        });
      }
      if (!gap) edits.push({ start: width.end, end: width.end, text: `${sep}gap="medium"` });
    } else {
      const { at, sep } = insertionPoint(source, tag, null);
      const attrs = ['layout="auto-fill"', `minItemWidth="${TILE_WIDTH}"`];
      if (!gap) attrs.push('gap="medium"');
      edits.push({ start: at, end: at, text: attrs.map((a) => `${sep}${a}`).join('') });
    }
    return { edits };
  },
});

/** Pure transform of one file's source (codemods/jsx-fold.mjs `foldComponent`). */
export function transformSource(source) {
  return foldComponent(source, RULE);
}

/** Scan a directory. Writes only when `write` is true. */
export function runCodemod({ root, write = false }) {
  return runFold({ root, write, rule: RULE });
}

if (isEntry(import.meta.url)) {
  process.exit(main(process.argv.slice(2), { bin: 'hds-tile-grid', rule: RULE }));
}
