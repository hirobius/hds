/**
 * hds#393 step 1: Grid takes over TileGrid's layout. `layout="auto-fill"`,
 * `minItemWidth` and the 12px `medium` gap step render TileGrid's recipe,
 * and Grid passes role, aria-* and id through to its root.
 *
 * Every pre-existing Grid option is pinned by
 * scripts/__tests__/spacing-computed-lock.test.mjs (gap) and below (columns);
 * scripts/__tests__/grid-tile-grid-parity.test.mjs compares the computed
 * pixels with TileGrid's in Chromium.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Grid } from './grid';

afterEach(cleanup);

const rootOf = (ui: React.ReactElement) => {
  const { container } = render(ui);
  return container.firstElementChild as HTMLElement;
};

/** Resolves a custom property through tokens.generated.css's :root declarations to a length. */
function resolveVar(css: string): string {
  const tokens = readFileSync(
    join(__dirname, '..', '..', 'styles', 'tokens.generated.css'),
    'utf8',
  );
  let value = css;
  for (let hop = 0; hop < 10; hop += 1) {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    if (!ref) return value;
    const decl = new RegExp(`${ref[1]}:\\s*([^;]+);`).exec(tokens);
    if (!decl) throw new Error(`${ref[1]} is not declared in tokens.generated.css`);
    value = decl[1].trim();
  }
  throw new Error(`${css} does not resolve within 10 hops`);
}

describe('Grid layout="auto-fill" (hds#393)', () => {
  it("renders TileGrid's recipe: minmax(min(220px, 100%), 1fr) and a 12px gap", () => {
    const el = rootOf(
      <Grid layout="auto-fill" minItemWidth="220px" gap="medium">
        <i />
      </Grid>,
    );
    expect(el.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(min(220px, 100%), 1fr))');
    expect(resolveVar(el.style.getPropertyValue('gap'))).toBe('12px');
  });

  it('wraps at 280px, capped at the container, when minItemWidth is not set', () => {
    const el = rootOf(
      <Grid layout="auto-fill">
        <i />
      </Grid>,
    );
    expect(el.style.gridTemplateColumns).toBe('repeat(auto-fill, minmax(min(280px, 100%), 1fr))');
  });
});

describe('Grid layout="auto-fit" with minItemWidth (hds#393)', () => {
  it('renders the track it always has when minItemWidth is not set', () => {
    const el = rootOf(
      <Grid layout="auto-fit">
        <i />
      </Grid>,
    );
    expect(el.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(280px, 1fr))');
  });

  it('wraps at minItemWidth, capped at the container', () => {
    const el = rootOf(
      <Grid layout="auto-fit" minItemWidth="12rem">
        <i />
      </Grid>,
    );
    expect(el.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(12rem, 100%), 1fr))');
  });

  it("is ignored by layout='fixed' and by subgrid", () => {
    const fixed = rootOf(
      <Grid columns={3} minItemWidth="220px">
        <i />
      </Grid>,
    );
    expect(fixed.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    cleanup();
    const sub = rootOf(
      <Grid subgrid layout="auto-fill" minItemWidth="220px">
        <i />
      </Grid>,
    );
    expect(sub.style.gridTemplateColumns).toBe('subgrid');
  });
});

describe('Grid rest props (hds#393)', () => {
  it('passes role, aria-* and id through to its root', () => {
    const el = rootOf(
      <Grid role="list" aria-label="Services" aria-busy="true" id="services">
        <i />
      </Grid>,
    );
    expect(el.getAttribute('role')).toBe('list');
    expect(el.getAttribute('aria-label')).toBe('Services');
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.id).toBe('services');
  });

  it('keeps its own data-hds-* identity, which rest props cannot replace', () => {
    const el = rootOf(
      <Grid {...({ 'data-hds-component': 'Other' } as object)}>
        <i />
      </Grid>,
    );
    expect(el.getAttribute('data-hds-component')).toBe('Grid');
  });
});
