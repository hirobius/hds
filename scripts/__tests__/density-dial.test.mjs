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

/** The generated [data-density="compact"] block (built from the tokens' Compact modes). */
const generatedCompact = rules(generated)
  .filter((r) => r.selector === '[data-density="compact"]')
  .map((r) => r.body)
  .join('\n');

describe('compact scope remaps the scale components consume', () => {
  const scaleBlock = generatedCompact;

  // xs is the control-internal step (icon-label gaps, chip padding): it tracks the
  // type, not the density, so it is the same 8px in both modes.
  for (const step of SCALE.filter((s) => s !== 'xs')) {
    it(`redeclares --semantic-space-scale-${step} on a primitive step smaller than comfortable`, () => {
      const ref = declOf(scaleBlock, `--semantic-space-scale-${step}`);
      expect(ref, `compact block must redeclare scale-${step}`).toMatch(/^--primitive-space-/);
      const compact = px(generated, ref);
      expect(compact).not.toBeNull();
      expect(compact).toBeLessThan(comfortableScale(step));
    });
  }

  it('comfortable (the default) is the roomier 2026-10 scale (8/20/28/40/64px)', () => {
    expect(SCALE.map(comfortableScale)).toEqual([8, 20, 28, 40, 64]);
  });

  it('compact is the app rhythm (8/12/16/24/32px)', () => {
    const got = SCALE.map(
      (s) =>
        px(generated, declOf(scaleBlock, `--semantic-space-scale-${s}`)) ?? comfortableScale(s),
    );
    expect(got).toEqual([8, 12, 16, 24, 32]);
  });

  it('every compact step is on the 4px grid', () => {
    for (const s of SCALE) {
      const ref = declOf(scaleBlock, `--semantic-space-scale-${s}`);
      if (ref) expect(px(generated, ref) % 4).toBe(0);
    }
  });

  it('theme.css does not hand-write the scale: the generated block is the one source', () => {
    expect(compactRules.map((r) => r.body).join('\n')).not.toMatch(
      /--semantic-space-scale-[\w-]+\s*:/,
    );
  });

  it('keeps the legacy --hds-space-* bridge, documented as legacy', () => {
    expect(compactRules.map((r) => r.body).join('\n')).toContain('--hds-space-xs');
    expect(theme).toMatch(/legacy bridge/i);
  });
});

describe('compact scope re-declares the aliases so nested scopes resolve against the remap', () => {
  for (const alias of ALIASES) {
    it(`the generated block redeclares --semantic-space-${alias}`, () => {
      expect(generatedCompact).toContain(`--semantic-space-${alias}:`);
    });
  }

  it('redeclares region-gutter (and layout-gutter) under 640px on scale-sm', () => {
    const mobile = compactRules.filter((r) => r.media && /max-width:\s*639px/.test(r.media));
    expect(
      mobile.some(
        (r) => declOf(r.body, '--semantic-space-region-gutter') === '--semantic-space-scale-sm',
      ),
    ).toBe(true);
    expect(mobile.some((r) => r.body.includes('--semantic-space-layout-gutter:'))).toBe(true);
  });

  it('holds section.stack at 48px under 640px instead of the comfortable 64px', () => {
    const mobile = compactRules.filter((r) => r.media && /max-width:\s*639px/.test(r.media));
    const ref = mobile.map((r) => declOf(r.body, '--semantic-space-section-stack')).find(Boolean);
    expect(px(generated, ref)).toBe(48);
  });

  it('desktop region-gutter is scale-lg and surface-padding is scale-md', () => {
    expect(declOf(generatedCompact, '--semantic-space-region-gutter')).toBe(
      '--semantic-space-scale-lg',
    );
    expect(declOf(generatedCompact, '--semantic-space-surface-padding')).toBe(
      '--semantic-space-scale-md',
    );
  });

  it('grid-gap (generated, its Compact mode) and layout-gap (theme.css) sit on scale-md', () => {
    const desk = compactRules
      .filter((r) => !r.media)
      .map((r) => r.body)
      .join('\n');
    expect(declOf(generatedCompact, '--semantic-layout-grid-gap')).toBe(
      '--semantic-space-scale-md',
    );
    expect(declOf(desk, '--semantic-space-layout-gap')).toBe('--semantic-space-scale-md');
  });

  it('leaves --semantic-space-component-medium alone', () => {
    expect(generatedCompact + compactRules.map((r) => r.body).join('\n')).not.toContain(
      '--semantic-space-component-medium',
    );
  });
});

/*
 * hds#206: `hds.density.*` in tokens.ts is a second t-shirt vocabulary with
 * different pixels (its sm is 8px, scale.sm is 16px). It reads the legacy
 * --hds-space-* bridge. It is deprecated (MIGRATIONS step 1) with a scale step
 * named for each key that has one, and each named step must compute the same
 * pixels as the key it replaces, at both densities.
 */
describe('hds.density is deprecated in favour of semantic.space.scale (hds#206)', () => {
  const tokensTs = read('src/app/design-system/tokens.ts');
  const doc = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*density:\s*\{/.exec(tokensTs)?.[1] ?? '';
  /** density key -> the scale step with the same pixels. */
  const TWIN = { sm: 'xs', md: 'sm', lg: 'md', xl: 'lg', xl2: 'xl' };
  /** density key -> its --hds-space-* suffix. */
  const HDS = {
    xs: 'xs',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    xl2: '2xl',
    xl3: '3xl',
    xl4: '4xl',
  };

  const comfortableBody = rules(theme)
    .filter((r) => !r.media && !/data-density|data-brand|data-tenant/.test(r.selector))
    .map((r) => r.body)
    .join('\n');
  const compactBody = compactRules.map((r) => r.body).join('\n') + '\n' + generatedCompact;
  const pxOf = (body, cssVar) => px(generated, declOf(body, cssVar));

  it('carries @deprecated and @removeIn on the density group', () => {
    expect(doc).toMatch(/@deprecated[^@]*semantic\.space\.scale/);
    expect(doc).toMatch(/@removeIn\s+1\.0\.0/);
  });

  it('names the scale step for each key that has one, and says which keys have none', () => {
    for (const [key, step] of Object.entries(TWIN)) {
      expect(doc).toContain(`\`density.${key}\` → \`scale.${step}\``);
    }
    for (const key of Object.keys(HDS).filter((k) => !(k in TWIN))) {
      expect(doc).toContain(`\`density.${key}\``);
    }
  });

  it.each(Object.entries(TWIN))(
    'density.%s computes the same pixels as scale.%s, comfortable and compact',
    (key, step) => {
      const hdsVar = `--hds-space-${HDS[key]}`;
      expect(pxOf(comfortableBody, hdsVar)).not.toBeNull();
      expect(pxOf(comfortableBody, hdsVar)).toBe(comfortableScale(step));
      expect(pxOf(compactBody, hdsVar)).not.toBeNull();
      // xs is not redeclared under compact: it is 8px in both densities.
      expect(pxOf(compactBody, hdsVar)).toBe(
        pxOf(compactBody, `--semantic-space-scale-${step}`) ?? comfortableScale(step),
      );
    },
  );
});
