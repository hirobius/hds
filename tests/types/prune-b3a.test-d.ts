/**
 * Type-tests for hds#393 step 1 (prune B3a): the Grid props TileGrid folds into.
 * Uses pure tsc --noEmit — no external test library needed:
 *   pnpm exec tsc --noEmit -p tests/types/tsconfig.json
 * A .ts file takes no JSX, so `createElement` stands in for
 * `<Grid layout="auto-fill" minItemWidth="220px">…</Grid>`; it checks the same
 * props, with the JSX children passed as `children`.
 */
import { createElement, type ComponentProps } from 'react';
import { Grid, type GridProps } from '../../src/app/components/grid';

// ── Shape assertions ──────────────────────────────────────────────────────────

// <Grid layout="auto-fill" minItemWidth="220px">
const _autoFill = createElement(Grid, {
  layout: 'auto-fill',
  minItemWidth: '220px',
  children: 'tile',
});

// TileGrid's recipe: 220px tiles on its 12px default gap, Grid's 'medium' step
const _tileGrid: GridProps = {
  layout: 'auto-fill',
  minItemWidth: '220px',
  gap: 'medium',
  children: null,
};

// auto-fit takes minItemWidth too; its 280px default is unchanged
const _autoFit: GridProps = { layout: 'auto-fit', minItemWidth: '16rem', children: null };

// Every existing layout and gap still compiles
const _fixed: GridProps['layout'] = 'fixed';
const _tight: GridProps['gap'] = 'tight';
const _normal: GridProps['gap'] = 'normal';
const _inset: GridProps['gap'] = 'inset';
const _spacious: GridProps['gap'] = 'spacious';

// Rest props reach the root: role, aria-*, id
const _rest = createElement(Grid, {
  role: 'list',
  'aria-label': 'Services',
  'aria-busy': true,
  id: 'services',
  children: 'tile',
});

// ComponentProps inference works
type InferredProps = ComponentProps<typeof Grid>;
const _fromInferred: InferredProps = { layout: 'auto-fill', gap: 'medium', children: null };

// ── Negative assertions (deliberate type errors) ──────────────────────────────

// @ts-expect-error — 'masonry' is not a Grid layout
const _badLayout: GridProps['layout'] = 'masonry';

// @ts-expect-error — minItemWidth is a CSS length string, not a number
const _numericWidth: GridProps['minItemWidth'] = 220;

// @ts-expect-error — the gap is semantic only: a raw length is not a step
const _rawGap: GridProps['gap'] = '12px';

// @ts-expect-error — TileGrid's 'sm' is not a Grid gap step; Grid's is 'medium'
const _tileGridGap: GridProps['gap'] = 'sm';

(void _autoFill, _tileGrid, _autoFit, _rest, _fromInferred);
(void _fixed, _tight, _normal, _inset, _spacious);
(void _badLayout, _numericWidth, _rawGap, _tileGridGap);
