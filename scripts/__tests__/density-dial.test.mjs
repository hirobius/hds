/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#336 — the density dial. [data-density='compact'] must remap the spacing
 * variables components actually consume (semantic.space.scale.* and the
 * aliases that resolve through them), not just the legacy --hds-space-* set.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const theme = read('src/styles/theme.css');
const generated = read('src/styles/tokens.generated.css');

const SCALE = ['xs', 'sm', 'md', 'lg', 'xl'];
const ALIASES = ['surface-padding', 'component-padding', 'region-gutter', 'layout-gutter'];

/** Every top-level `selector { body }` rule (or rule inside one @media) as {selector, body, media}. */
function rules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(stripped))) {
    const before = stripped.slice(0, m.index);
    const inMedia = /@media[^{]*\{[^}]*$/.test(before)
      ? /@media([^{]*)\{[^}]*$/.exec(before)[1].trim()
      : null;
    const selector = m[1].replace(/^[\s}]*(@media[^{]*\{)?/, '').trim();
    out.push({ selector, body: m[2], media: inMedia });
  }
  return out;
}

const declOf = (body, prop) => {
  const m = new RegExp(`${prop}:\\s*var\\((--[\\w-]+)\\)`).exec(body);
  return m ? m[1] : null;
};

const compactRules = rules(theme).filter(
  (r) =>
    /data-density=['"]compact['"]/.test(r.selector) && !/data-brand|data-tenant/.test(r.selector),
);

const px = (css, name) => {
  const m = new RegExp(`${name}:\\s*(\\d+)px`).exec(css);
  return m ? Number(m[1]) : null;
};
const comfortableScale = (step) => {
  const ref = /:root\s*\{[\s\S]*?\}/.exec(generated)[0];
  const prim = declOf(ref, `--semantic-space-scale-${step}`);
  return px(generated, prim);
};

describe('compact scope remaps the scale components consume', () => {
  const scaleBlock = compactRules.map((r) => r.body).join('\n');

  for (const step of SCALE) {
    it(`redeclares --semantic-space-scale-${step} on a primitive step smaller than comfortable`, () => {
      const ref = declOf(scaleBlock, `--semantic-space-scale-${step}`);
      expect(ref, `compact block must redeclare scale-${step}`).toMatch(/^--primitive-space-/);
      const compact = px(generated, ref);
      expect(compact).not.toBeNull();
      expect(compact).toBeLessThan(comfortableScale(step));
    });
  }

  it('lands on the documented compact steps (6/12/20/24/40px)', () => {
    const got = SCALE.map((s) => px(generated, declOf(scaleBlock, `--semantic-space-scale-${s}`)));
    expect(got).toEqual([6, 12, 20, 24, 40]);
  });

  it('keeps the legacy --hds-space-* bridge, documented as legacy', () => {
    expect(scaleBlock).toContain('--hds-space-xs');
    expect(theme).toMatch(/legacy bridge/i);
  });
});

describe('compact scope re-declares the aliases so nested scopes resolve against the remap', () => {
  const aliasRules = compactRules.filter((r) =>
    ALIASES.some((a) => r.body.includes(`--semantic-space-${a}`)),
  );

  for (const alias of ALIASES) {
    it(`redeclares --semantic-space-${alias}`, () => {
      expect(
        aliasRules.some((r) => !r.media && r.body.includes(`--semantic-space-${alias}:`)),
      ).toBe(true);
    });
  }

  it('redeclares region-gutter (and layout-gutter) under 640px on scale-sm', () => {
    const mobile = aliasRules.filter((r) => r.media && /max-width:\s*639px/.test(r.media));
    expect(
      mobile.some(
        (r) => declOf(r.body, '--semantic-space-region-gutter') === '--semantic-space-scale-sm',
      ),
    ).toBe(true);
    expect(mobile.some((r) => r.body.includes('--semantic-space-layout-gutter:'))).toBe(true);
  });

  it('desktop region-gutter is scale-lg and surface-padding is scale-md', () => {
    const desk = aliasRules
      .filter((r) => !r.media)
      .map((r) => r.body)
      .join('\n');
    expect(declOf(desk, '--semantic-space-region-gutter')).toBe('--semantic-space-scale-lg');
    expect(declOf(desk, '--semantic-space-surface-padding')).toBe('--semantic-space-scale-md');
  });

  it('alias rules have zero specificity (:where) so a [data-brand] tenant rule wins', () => {
    expect(aliasRules.length).toBeGreaterThan(0);
    for (const r of aliasRules) {
      expect(r.selector).toMatch(/^:where\(/);
      expect(r.selector.replace(/:where\([^)]*\)/g, '')).toBe('');
    }
  });

  it('leaves --semantic-space-component-medium alone', () => {
    expect(compactRules.map((r) => r.body).join('\n')).not.toContain(
      '--semantic-space-component-medium',
    );
  });
});
