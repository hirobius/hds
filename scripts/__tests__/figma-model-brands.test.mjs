/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/figma-model.mjs — the Brand and Density axes (readiness plan A7).
 *
 * Seam: buildFigmaModel(raw, { brands }) with synthetic demo tenant overlays
 * over the fixture graph (fixtures/figma-model/tokens.json). Expected values
 * are worked by hand from the fixture and the overlays below, following the
 * CSS the tenant emitter writes (build-tokens.mjs buildTenantCSS):
 *   [data-brand="x"]                        rest value (modes.Light ?? $value)
 *   [data-brand="x"][data-theme="dark"]     modes.Dark (else the rest value, R4)
 *   [data-brand="x"][data-density="compact"] modes.Compact (else the rest value, R9)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { validateFigmaModel, summarizeFigmaModel } from '../lib/figma-model-invariants.mjs';
import { formatSummary } from '../build-figma-model.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = () =>
  JSON.parse(readFileSync(join(HERE, 'fixtures', 'figma-model', 'tokens.json'), 'utf8'));

const modes = (map) => ({ 'com.figma.variables': { modes: map } });

/** Two demo tenants: one sharp and dense, one with its own accent and page color. */
const SHARP = {
  slug: 'sharp-demo',
  overlay: {
    role: { radius: { $type: 'dimension', $value: { value: 0, unit: 'px' } } },
    semantic: {
      space: {
        $type: 'dimension',
        component: {
          gap: {
            $value: '{primitive.space.4}',
            $extensions: modes({ Compact: '{primitive.space.2}' }),
          },
        },
      },
    },
  },
};
const ACCENT = {
  slug: 'accent-demo',
  overlay: {
    semantic: {
      color: {
        $type: 'color',
        surface: {
          accent: {
            $value: '#8B6F47',
            $extensions: modes({ Light: '#8B6F47', Dark: '{primitive.color.neutral.900}' }),
          },
          page: { $value: '#fafafa' },
        },
      },
    },
  },
};
const brands = (...tenants) => ({ baseMode: 'Hirobius', tenants });

const collection = (model, key) => model.collections.find((c) => c.key === key);
const variable = (model, path) =>
  model.collections
    .flatMap((c) => c.variables.map((v) => ({ ...v, collection: c.key })))
    .find((v) => v.path === path);
const hex = (value) => {
  const { r, g, b, a } = value;
  return { r, g, b, a };
};
const rgb = (h) => ({
  r: Math.round((parseInt(h.slice(1, 3), 16) / 255) * 1e6) / 1e6,
  g: Math.round((parseInt(h.slice(3, 5), 16) / 255) * 1e6) / 1e6,
  b: Math.round((parseInt(h.slice(5, 7), 16) / 255) * 1e6) / 1e6,
  a: 1,
});

describe('buildFigmaModel without brand modes', () => {
  it('has no Brand or Density collection, so existing files are unchanged', () => {
    expect(buildFigmaModel(fixture()).collections.map((c) => c.key)).toEqual([
      'primitive',
      'semantic',
      'component',
      'role',
    ]);
    expect(buildFigmaModel(fixture(), { brands: null })).toEqual(buildFigmaModel(fixture()));
  });
});

describe('buildFigmaModel — Brand collection', () => {
  const model = buildFigmaModel(fixture(), { brands: brands(SHARP, ACCENT) });

  it('appends Brand and Density after the tier collections, published', () => {
    expect(model.collections.map((c) => c.name)).toEqual([
      'Hirobius/Primitives',
      'Hirobius/Semantic',
      'Hirobius/Component',
      'Hirobius/Role',
      'Hirobius/Brand',
      'Hirobius/Density',
    ]);
    expect(collection(model, 'brand')).toMatchObject({
      modes: ['Hirobius', 'sharp-demo', 'accent-demo'],
      hiddenFromPublishing: false,
    });
    expect(collection(model, 'density')).toMatchObject({
      modes: ['Comfortable', 'Compact'],
      hiddenFromPublishing: false,
    });
  });

  it('holds only the paths a demo tenant overrides, one variable per theme or density variant', () => {
    expect(collection(model, 'brand').variables.map((v) => v.name)).toEqual([
      'semantic/color/surface/page/Light',
      'semantic/color/surface/page/Dark',
      'semantic/color/surface/accent/Light',
      'semantic/color/surface/accent/Dark',
      'semantic/space/component/gap/Comfortable',
      'semantic/space/component/gap/Compact',
      'role/radius',
    ]);
    expect(collection(model, 'density').variables.map((v) => v.name)).toEqual([
      'semantic/space/component/gap',
    ]);
  });

  it('keeps axis variables out of every picker and out of Dev Mode code', () => {
    for (const v of [
      ...collection(model, 'brand').variables,
      ...collection(model, 'density').variables,
    ]) {
      expect(v.scopes, v.path).toEqual([]);
      expect(v.codeSyntax, v.path).toEqual({});
      expect(v.hiddenFromPublishing, v.path).toBe(false);
    }
  });

  it('a brand-only path: the base token in Hirobius, the override where a tenant sets one', () => {
    expect(variable(model, 'brand.role.radius')).toMatchObject({
      collection: 'brand',
      resolvedType: 'FLOAT',
      unit: 'px',
      valuesByMode: {
        Hirobius: { alias: 'semantic.radius.action' },
        'sharp-demo': { value: 0 },
        'accent-demo': { alias: 'semantic.radius.action' },
      },
    });
    expect(variable(model, 'brand.role.radius').description).toMatch(/role\.radius/);
    expect(variable(model, 'brand.role.radius').description).toMatch(/sharp-demo/);
    // The Role variable keeps its id-bearing path and now follows the Brand mode.
    expect(variable(model, 'role.radius')).toMatchObject({
      collection: 'role',
      codeSyntax: { WEB: 'var(--role-radius)' },
      valuesByMode: { Default: { alias: 'brand.role.radius' } },
    });
    expect(variable(model, 'role.radius').description).toMatch(/Hirobius\/Brand/);
  });

  it('a path a tenant themes: Light and Dark variants, the Semantic variable picks by theme', () => {
    const blue = { alias: 'primitive.color.blue.500' };
    expect(variable(model, 'brand.semantic.color.surface.accent.Light').valuesByMode).toEqual({
      Hirobius: blue,
      'sharp-demo': blue,
      'accent-demo': { value: rgb('#8b6f47') },
    });
    expect(variable(model, 'brand.semantic.color.surface.accent.Dark').valuesByMode).toEqual({
      Hirobius: blue,
      'sharp-demo': blue,
      'accent-demo': { alias: 'primitive.color.neutral.900' },
    });
    expect(variable(model, 'semantic.color.surface.accent').valuesByMode).toEqual({
      Light: { alias: 'brand.semantic.color.surface.accent.Light' },
      Dark: { alias: 'brand.semantic.color.surface.accent.Dark' },
    });
  });

  it('a themed base token overridden with $value only: that value in Light and Dark (R4)', () => {
    const page = (variant) =>
      variable(model, `brand.semantic.color.surface.page.${variant}`).valuesByMode;
    expect(page('Light')).toMatchObject({
      Hirobius: { alias: 'primitive.color.neutral.white' },
      'accent-demo': { value: rgb('#fafafa') },
    });
    expect(page('Dark')).toMatchObject({
      Hirobius: { alias: 'primitive.color.neutral.black' },
      'sharp-demo': { alias: 'primitive.color.neutral.black' },
    });
    expect(hex(page('Dark')['accent-demo'].value)).toEqual(rgb('#fafafa'));
  });

  it('a path a tenant compacts: Comfortable and Compact variants behind one Density variable', () => {
    expect(variable(model, 'brand.semantic.space.component.gap.Comfortable').valuesByMode).toEqual({
      Hirobius: { alias: 'primitive.space.2' },
      'sharp-demo': { alias: 'primitive.space.4' },
      'accent-demo': { alias: 'primitive.space.2' },
    });
    // No Compact value means the rest value applies at Compact density (R9).
    expect(variable(model, 'brand.semantic.space.component.gap.Compact').valuesByMode).toEqual({
      Hirobius: { alias: 'primitive.space.2' },
      'sharp-demo': { alias: 'primitive.space.2' },
      'accent-demo': { alias: 'primitive.space.2' },
    });
    expect(variable(model, 'density.semantic.space.component.gap')).toMatchObject({
      collection: 'density',
      resolvedType: 'FLOAT',
      unit: 'px',
      valuesByMode: {
        Comfortable: { alias: 'brand.semantic.space.component.gap.Comfortable' },
        Compact: { alias: 'brand.semantic.space.component.gap.Compact' },
      },
    });
    expect(variable(model, 'semantic.space.component.gap').valuesByMode).toEqual({
      Light: { alias: 'density.semantic.space.component.gap' },
      Dark: { alias: 'density.semantic.space.component.gap' },
    });
  });

  it('passes every invariant', () => {
    expect(validateFigmaModel(model)).toEqual([]);
  });

  it('leaves out Density when no demo tenant declares a Compact value', () => {
    const accentOnly = buildFigmaModel(fixture(), { brands: brands(ACCENT) });
    expect(accentOnly.collections.map((c) => c.key)).toEqual([
      'primitive',
      'semantic',
      'component',
      'role',
      'brand',
    ]);
    expect(validateFigmaModel(accentOnly)).toEqual([]);
  });

  it('skips an override of a token Figma does not carry (declared in NOT_IN_FIGMA)', () => {
    const motion = {
      slug: 'motion-demo',
      overlay: {
        semantic: {
          motion: {
            $type: 'motion',
            productive: {
              $value: {
                duration: '{primitive.duration.short}',
                easing: '{primitive.easing.standard}',
              },
            },
          },
        },
      },
    };
    const m = buildFigmaModel(fixture(), { brands: brands(motion) });
    expect(collection(m, 'brand').variables).toEqual([]);
    expect(validateFigmaModel(m)).toEqual([]);
  });

  it('summarizes the Brand and Density collections like any other', () => {
    const summary = summarizeFigmaModel(model);
    expect(summary.collections.slice(4)).toEqual([
      { name: 'Hirobius/Brand', modes: ['Hirobius', 'sharp-demo', 'accent-demo'], variables: 7 },
      { name: 'Hirobius/Density', modes: ['Comfortable', 'Compact'], variables: 1 },
    ]);
    expect(formatSummary(summary, 'figma/model.json')).toMatch(
      /Hirobius\/Brand\s+Hirobius\/sharp-demo\/accent-demo\s+7 variables/,
    );
  });
});

describe('buildFigmaModel refuses brand overlays Figma cannot express', () => {
  const build =
    (...tenants) =>
    () =>
      buildFigmaModel(fixture(), { brands: brands(...tenants) });
  const tenant = (overlay, slug = 'odd-demo') => ({ slug, overlay });

  it('a tenant theming a token that lives in a single-mode collection', () => {
    expect(
      build(
        tenant({
          component: {
            button: {
              bg: {
                $type: 'color',
                $value: '#111111',
                $extensions: modes({ Light: '#111111', Dark: '#eeeeee' }),
              },
            },
          },
        }),
      ),
    ).toThrow(/odd-demo.*component\.button\.bg.*Hirobius\/Component.*Light\/Dark/);
  });

  it('one path varying by both theme and density', () => {
    expect(
      build(
        tenant({
          semantic: {
            color: {
              $type: 'color',
              surface: {
                accent: {
                  $value: '#111111',
                  $extensions: modes({ Light: '#111111', Compact: '#222222' }),
                },
              },
            },
          },
        }),
      ),
    ).toThrow(/semantic\.color\.surface\.accent.*Light\/Dark.*Compact/);
  });

  it('a composite override (text and effect styles have no modes)', () => {
    expect(
      build(
        tenant({
          semantic: {
            typography: {
              $type: 'typography',
              caption: { $value: { fontFamily: '{primitive.typography.family.primary}' } },
            },
          },
        }),
      ),
    ).toThrow(/odd-demo.*semantic\.typography\.caption.*typography/);
  });

  it('an override whose type differs from the base token', () => {
    expect(build(tenant({ role: { radius: { $type: 'color', $value: '#000000' } } }))).toThrow(
      /odd-demo.*role\.radius.*color.*dimension/,
    );
  });

  it('an override of a path the base tokens do not have (R5)', () => {
    expect(
      build(tenant({ semantic: { color: { $type: 'color', brand: { $value: '#000000' } } } })),
    ).toThrow(/odd-demo.*semantic\.color\.brand.*hirobius\.tokens\.json/);
  });

  it('a base token with a Compact mode, which build-tokens never emits as CSS', () => {
    const raw = fixture();
    raw.semantic.space.component.gap.$extensions = modes({ Compact: '{primitive.space.2}' });
    expect(() => buildFigmaModel(raw)).toThrow(/semantic\.space\.component\.gap.*Compact/);
  });

  it('two tenants with one slug, or a slug equal to the base mode name', () => {
    expect(build(SHARP, SHARP)).toThrow(/sharp-demo.*twice/);
    expect(() =>
      buildFigmaModel(fixture(), { brands: { baseMode: 'sharp-demo', tenants: [SHARP] } }),
    ).toThrow(/sharp-demo.*base mode/);
  });
});

describe('validateFigmaModel — Brand and Density rules', () => {
  const mutated = (mutate) => {
    const model = buildFigmaModel(fixture(), { brands: brands(SHARP, ACCENT) });
    const find = (path) =>
      model.collections.flatMap((c) => c.variables).find((v) => v.path === path);
    mutate(model, find);
    return validateFigmaModel(model);
  };

  it.each([
    [
      'an axis variable with a scope',
      (m, find) => (find('brand.role.radius').scopes = ['CORNER_RADIUS']),
      /brand\.role\.radius.*Hirobius\/Brand.*scopes/,
    ],
    [
      'an axis variable with a codeSyntax',
      (m, find) =>
        (find('density.semantic.space.component.gap').codeSyntax = { WEB: 'var(--gap)' }),
      /density\.semantic\.space\.component\.gap.*codeSyntax/,
    ],
    [
      'Density modes other than Comfortable and Compact',
      (m) => {
        const density = m.collections.find((c) => c.key === 'density');
        density.modes = ['Comfortable', 'Dense'];
        for (const v of density.variables) {
          v.valuesByMode = {
            Comfortable: v.valuesByMode.Comfortable,
            Dense: v.valuesByMode.Compact,
          };
        }
      },
      /Hirobius\/Density.*Comfortable.*Compact/,
    ],
    [
      'an alias cycle across modes',
      (m, find) => (find('brand.role.radius').valuesByMode.Hirobius = { alias: 'role.radius' }),
      /cycle.*brand\.role\.radius.*role\.radius/,
    ],
  ])('flags %s', (_label, mutate, message) => {
    const violations = mutated(mutate);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(message);
  });

  it('flags more demo tenants than a Professional plan has Brand modes for', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      slug: `demo-${i}`,
      overlay: SHARP.overlay,
    }));
    expect(
      validateFigmaModel(buildFigmaModel(fixture(), { brands: brands(...many.slice(0, 9)) })),
    ).toEqual([]);
    expect(
      validateFigmaModel(buildFigmaModel(fixture(), { brands: brands(...many) })).join('\n'),
    ).toMatch(/Hirobius\/Brand has 11 modes/);
  });
});
