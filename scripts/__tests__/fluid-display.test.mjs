// @vitest-environment node
/**
 * Fluid display size (hds#1300). folio hand-rolled
 * clamp(2.5rem, 1.6rem + 4vw, <display size>) on its hero. HDS now ships it as
 * --semantic-typography-display-font-size-fluid, an opt-in var: the display
 * size itself does not change. The slope is computed, never typed: linear from
 * the floor (fontSizeMin) at a 360px viewport to the display size at 760px.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FLUID_VIEWPORT, fluidPreferred } from '../lib/token-emit/css.mjs';

const ROOT = join(__dirname, '..', '..');
const css = readFileSync(join(ROOT, 'src/styles/tokens.generated.css'), 'utf8');
const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));

/** The px the clamp resolves to at a viewport width, for a 16px root. */
const at = (vw, min, max) => {
  const [rem, vwPart] = fluidPreferred(min, max).split(' + ');
  const preferred = parseFloat(rem) * 16 + (parseFloat(vwPart) * vw) / 100;
  return Math.min(max, Math.max(min, preferred));
};

describe('fluidPreferred', () => {
  it("reproduces folio's 1.6rem + 4vw for 40px to 56px over 360-760px", () => {
    expect(FLUID_VIEWPORT).toEqual({ min: 360, max: 760 });
    expect(fluidPreferred(40, 56)).toBe('1.6rem + 4vw');
  });

  it('measures what folio measured: 41.2px at 390 and the full 56px at 1440', () => {
    expect(at(390, 40, 56)).toBeCloseTo(41.2, 5);
    expect(at(1440, 40, 56)).toBe(56);
    expect(at(320, 40, 56)).toBe(40);
  });
});

describe('the display tokens', () => {
  it('give display a 40px floor and keep its size at 56px (Figma draws the max)', () => {
    // rem, so the floor follows the user's browser font size (a11y, #1334 review).
    expect(tokens.primitive.typography.size.displayMin.$value).toEqual({ value: 2.5, unit: 'rem' });
    expect(tokens.semantic.typography.display.$value.fontSizeMin).toBe(
      '{primitive.typography.size.displayMin}',
    );
    expect(tokens.primitive.typography.size.display.$value).toEqual({ value: 56, unit: 'px' });
  });

  it('emit the opt-in fluid var, bounded by the floor and the display size vars', () => {
    expect(css).toContain(
      '--semantic-typography-display-font-size-fluid: clamp(var(--primitive-typography-size-displayMin), 1.6rem + 4vw, var(--semantic-typography-display-font-size));',
    );
  });

  it('emit the floor in rem, 40px at the default 16px root', () => {
    expect(css).toContain('--primitive-typography-size-displayMin: 2.5rem;');
  });

  it('leave the display size itself unchanged', () => {
    expect(css).toContain(
      '--semantic-typography-display-font-size: var(--primitive-typography-size-display);',
    );
  });
});

describe('Figma', () => {
  it('draws the rem floor as px at a 16px root', async () => {
    const { buildFigmaModel } = await import('../lib/figma-model.mjs');
    const model = buildFigmaModel(tokens);
    const all = JSON.stringify(model);
    expect(all).toContain('displayMin');
    const v = model.collections
      .flatMap((c) => c.variables ?? [])
      .find((x) => (x.name ?? '').endsWith('displayMin'));
    expect(v).toBeTruthy();
    expect(JSON.stringify(v)).toMatch(/:40\b/);
  });
});
