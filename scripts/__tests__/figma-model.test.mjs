/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/figma-model.mjs — the tokens → Figma model exporter.
 *
 * Seams: buildFigmaModel(raw), validateFigmaModel(model) and summarizeFigmaModel. The fixture graph
 * (fixtures/figma-model/tokens.json) exercises every mapping path; expected
 * values below are worked by hand from that fixture, not read back from the
 * exporter.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { validateFigmaModel, summarizeFigmaModel } from '../lib/figma-model-invariants.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(HERE, 'fixtures', 'figma-model', 'tokens.json'), 'utf8'),
);

const collection = (model, key) => model.collections.find((c) => c.key === key);
const variable = (model, path) =>
  model.collections
    .flatMap((c) => c.variables.map((v) => ({ ...v, collection: c.key })))
    .find((v) => v.path === path);

describe('buildFigmaModel — collections and modes', () => {
  const model = buildFigmaModel(fixture);

  it('emits one collection per tier, in tier order', () => {
    expect(model.collections.map((c) => c.name)).toEqual([
      'Hirobius/Primitives',
      'Hirobius/Semantic',
      'Hirobius/Component',
      'Hirobius/Role',
    ]);
  });

  it('keeps Primitives single-mode and hidden from publishing', () => {
    const primitives = collection(model, 'primitive');
    expect(primitives.modes).toEqual(['Default']);
    expect(primitives.hiddenFromPublishing).toBe(true);
    expect(primitives.variables.every((v) => v.hiddenFromPublishing)).toBe(true);
  });

  it('keeps one theme axis: only Semantic has Light/Dark, even with a themed component token', () => {
    expect(collection(model, 'semantic').modes).toEqual(['Light', 'Dark']);
    expect(collection(model, 'component').modes).toEqual(['Default']);
    expect(collection(model, 'role').modes).toEqual(['Default']);
  });

  it('places a themed component token in the Semantic theme collection, still published', () => {
    // A Component Light/Dark axis would sit on Auto (= Light) while a frame's
    // Semantic mode is Dark, so the token would show its Light alias in Dark.
    expect(variable(model, 'component.button.text')).toMatchObject({
      collection: 'semantic',
      name: 'button/text',
      hiddenFromPublishing: false,
      codeSyntax: { WEB: 'var(--component-button-text)' },
      scopes: ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'],
      description: 'Themed, so it lives in Hirobius/Semantic, the one Light/Dark collection.',
      valuesByMode: {
        Light: { alias: 'semantic.color.content.primary' },
        Dark: { alias: 'semantic.color.surface.page' },
      },
    });
    expect(variable(model, 'component.button.bg')).toMatchObject({
      collection: 'component',
      valuesByMode: { Default: { alias: 'semantic.color.surface.accent' } },
    });
  });

  it('places a themed primitive in the Semantic theme collection, still hidden', () => {
    const shadow = variable(model, 'primitive.shadow.color');
    expect(shadow.collection).toBe('semantic');
    expect(shadow.hiddenFromPublishing).toBe(true);
    expect(shadow.description).toBe(
      'HSL channels for shadow tints. Themed, so it lives in Hirobius/Semantic, the one Light/Dark collection.',
    );
    // hsl(220 13% 18%): C = 0.0468, m = 0.1566 → r = 0.1566, b = 0.2034; hsl(0 0% 0%) → black
    expect(shadow.valuesByMode.Light.value.r).toBeCloseTo(0.1566, 4);
    expect(shadow.valuesByMode.Light.value.b).toBeCloseTo(0.2034, 4);
    expect(shadow.valuesByMode.Dark).toEqual({ value: { r: 0, g: 0, b: 0, a: 1 } });
  });

  it('names variables by token path without the tier, with a CSS codeSyntax', () => {
    const page = variable(model, 'semantic.color.surface.page');
    expect(page.name).toBe('color/surface/page');
    expect(page.codeSyntax).toEqual({ WEB: 'var(--semantic-color-surface-page)' });
    expect(page.description).toBe('Page background.');
  });
});

describe('buildFigmaModel — values', () => {
  const model = buildFigmaModel(fixture);

  it('reads Light and Dark from com.figma.variables modes, keyed by token path', () => {
    const page = variable(model, 'semantic.color.surface.page');
    expect(page.valuesByMode).toEqual({
      Light: { alias: 'primitive.color.neutral.white' },
      Dark: { alias: 'primitive.color.neutral.black' },
    });
  });

  it('repeats $value in both modes for an unthemed token in a themed collection', () => {
    expect(variable(model, 'semantic.color.surface.accent').valuesByMode).toEqual({
      Light: { alias: 'primitive.color.blue.500' },
      Dark: { alias: 'primitive.color.blue.500' },
    });
  });

  it('converts raw colors to Figma RGBA', () => {
    expect(variable(model, 'primitive.color.neutral.white').valuesByMode.Default).toEqual({
      value: { r: 1, g: 1, b: 1, a: 1 },
    });
    const blue = variable(model, 'primitive.color.blue.500').valuesByMode.Default.value;
    expect([blue.r, blue.g, blue.b].map((c) => Math.round(c * 255))).toEqual([30, 46, 253]);
    const oklch = variable(model, 'primitive.color.blue.600');
    expect(oklch.resolvedType).toBe('COLOR');
    expect(oklch.valuesByMode.Default.value.a).toBe(1);
  });

  it('exports px dimensions as FLOAT px, font weights as FLOAT and families as their first entry', () => {
    const space = variable(model, 'primitive.space.4');
    expect(space.resolvedType).toBe('FLOAT');
    expect(space.unit).toBe('px');
    expect(space.valuesByMode.Default).toEqual({ value: 16 });
    expect(variable(model, 'primitive.typography.weight.bold').valuesByMode.Default).toEqual({
      value: 700,
    });
    const family = variable(model, 'primitive.typography.family.primary');
    expect(family.resolvedType).toBe('STRING');
    expect(family.valuesByMode.Default).toEqual({ value: 'Satoshi' });
  });

  it('keeps aliases into another collection as aliases', () => {
    expect(variable(model, 'role.background').valuesByMode).toEqual({
      Default: { alias: 'semantic.color.surface.page' },
    });
    expect(variable(model, 'role.radius').unit).toBe('px');
  });
});

describe('buildFigmaModel — not in Figma', () => {
  const model = buildFigmaModel(fixture);
  const entry = (id) => model.notInFigma.find((e) => e.id === id);

  it('declares every excluded token under an entry with a reason', () => {
    expect(entry('motion').tokens).toEqual([
      'primitive.duration.short',
      'primitive.easing.standard',
      'primitive.easing.elastic',
      'semantic.motion.productive',
    ]);
    expect(entry('z-index').tokens).toEqual(['primitive.zIndex.10']);
    expect(entry('breakpoints').tokens).toEqual(['primitive.breakpoint.md']);
    expect(entry('relative-typography').tokens).toEqual([
      'primitive.typography.lineHeight.tight',
      'primitive.typography.lineHeight.normal',
      'primitive.typography.letterSpacing.tight',
      'primitive.typography.letterSpacing.caps',
      'semantic.typography.lineHeight.tight',
    ]);
    expect(entry('text-measure').tokens).toEqual(['semantic.typography.body.maxWidth']);
    for (const e of model.notInFigma) expect(e.reason.length).toBeGreaterThan(40);
  });

  it('exports no variable for an excluded token', () => {
    for (const path of model.notInFigma.flatMap((e) => e.tokens)) {
      expect(variable(model, path)).toBeUndefined();
    }
  });

  it('refuses a token type it has no mapping for, naming the fix', () => {
    const raw = { primitive: { gradient: { hero: { $type: 'gradient', $value: [] } } } };
    expect(() => buildFigmaModel(raw)).toThrow(/primitive\.gradient\.hero.*gradient.*NOT_IN_FIGMA/);
  });

  it('refuses a variable that aliases a token Figma will not have', () => {
    const raw = {
      primitive: { breakpoint: { md: { $type: 'dimension', $value: { value: 768, unit: 'px' } } } },
      component: { nav: { maxWidth: { $type: 'dimension', $value: '{primitive.breakpoint.md}' } } },
    };
    expect(() => buildFigmaModel(raw)).toThrow(
      /component\.nav\.maxWidth aliases primitive\.breakpoint\.md.*breakpoints/,
    );
  });
});

describe('buildFigmaModel — ch widths', () => {
  it('converts ch to px with the measured "0" advance at the body text size', () => {
    const model = buildFigmaModel(fixture);
    // 50ch × 0.693em (Satoshi 500 "0" advance) × 17px (body font size) = 589.05px
    expect(variable(model, 'primitive.size.width.50ch')).toMatchObject({
      unit: 'px',
      valuesByMode: { Default: { value: 589.05 } },
    });
    expect(variable(model, 'semantic.layout.prose.maxWidth')).toMatchObject({
      unit: 'px',
      valuesByMode: { Light: { alias: 'primitive.size.width.50ch' } },
    });
  });

  it('refuses to convert when the body font no longer matches the measured basis', () => {
    const changed = structuredClone(fixture);
    changed.semantic.typography.body.$value.fontFamily = '{primitive.typography.family.mono}';
    expect(() => buildFigmaModel(changed)).toThrow(
      /ch.*measured for Satoshi 500.*Geist Mono 500.*re-measure/,
    );
  });
});

describe('buildFigmaModel — scopes', () => {
  const model = buildFigmaModel(fixture);
  const scopes = (path) => variable(model, path).scopes;

  it('hides primitives from every picker so designers reach them through aliases', () => {
    expect(scopes('primitive.color.neutral.white')).toEqual([]);
    expect(scopes('primitive.space.4')).toEqual([]);
    expect(scopes('primitive.shadow.color')).toEqual([]);
    expect(scopes('primitive.typography.family.primary')).toEqual([]);
  });

  it('scopes colors by role: fills, text + icons, strokes', () => {
    expect(scopes('semantic.color.surface.page')).toEqual(['FRAME_FILL', 'SHAPE_FILL']);
    expect(scopes('component.button.bg')).toEqual(['FRAME_FILL', 'SHAPE_FILL']);
    expect(scopes('role.background')).toEqual(['FRAME_FILL', 'SHAPE_FILL']);
    expect(scopes('semantic.color.content.primary')).toEqual([
      'TEXT_FILL',
      'SHAPE_FILL',
      'STROKE_COLOR',
    ]);
    expect(scopes('component.button.text')).toEqual(['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR']);
    expect(scopes('role.card-foreground')).toEqual(['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR']);
    expect(scopes('semantic.color.border.default')).toEqual(['STROKE_COLOR']);
    expect(scopes('role.ring')).toEqual(['STROKE_COLOR']);
    expect(scopes('semantic.accent.hover')).toEqual(['ALL_FILLS', 'STROKE_COLOR']);
    expect(scopes('role.primary')).toEqual(['ALL_FILLS', 'STROKE_COLOR']);
  });

  it('scopes numbers to the property they size', () => {
    expect(scopes('semantic.space.component.gap')).toEqual(['GAP']);
    expect(scopes('component.button.paddingX')).toEqual(['GAP']);
    expect(scopes('component.button.height')).toEqual(['WIDTH_HEIGHT']);
    expect(scopes('semantic.layout.prose.maxWidth')).toEqual(['WIDTH_HEIGHT']);
    expect(scopes('semantic.radius.action')).toEqual(['CORNER_RADIUS']);
    expect(scopes('role.radius')).toEqual(['CORNER_RADIUS']);
    expect(scopes('component.button.fontSize')).toEqual(['FONT_SIZE']);
    expect(scopes('component.button.fontWeight')).toEqual(['FONT_WEIGHT']);
    expect(scopes('semantic.borderWidth.default')).toEqual(['STROKE_FLOAT']);
    expect(scopes('component.lightbox.backdrop.blur')).toEqual(['EFFECT_FLOAT']);
  });

  it('falls back to ALL_SCOPES only where Figma has no dedicated scope', () => {
    expect(scopes('semantic.layout.grid.columns.desktop')).toEqual(['ALL_SCOPES']);
  });
});

describe('buildFigmaModel — typography', () => {
  const model = buildFigmaModel(fixture);
  const style = (name) => model.textStyles.find((s) => s.name === name);

  it('expands a typography composite into px variables resolved at its own font size', () => {
    expect(variable(model, 'semantic.typography.h1.font-family')).toMatchObject({
      name: 'typography/h1/font-family',
      collection: 'semantic',
      resolvedType: 'STRING',
      scopes: ['FONT_FAMILY'],
      valuesByMode: {
        Light: { alias: 'primitive.typography.family.primary' },
        Dark: { alias: 'primitive.typography.family.primary' },
      },
    });
    expect(variable(model, 'semantic.typography.h1.font-size')).toMatchObject({
      unit: 'px',
      scopes: ['FONT_SIZE'],
      valuesByMode: { Light: { alias: 'primitive.typography.size.4xl' } },
    });
    // -0.01em × 48px = -0.48px; line-height 1.25 × 48px = 60px
    expect(variable(model, 'semantic.typography.h1.letter-spacing')).toMatchObject({
      unit: 'px',
      scopes: ['LETTER_SPACING'],
      codeSyntax: { WEB: 'var(--semantic-typography-h1-letter-spacing)' },
      description: 'Page title. Converted from -0.01em at 48px.',
      valuesByMode: { Light: { value: -0.48 }, Dark: { value: -0.48 } },
    });
    expect(variable(model, 'semantic.typography.h1.line-height')).toMatchObject({
      unit: 'px',
      scopes: ['LINE_HEIGHT'],
      description: 'Page title. Converted from 1.25 × 48px.',
      valuesByMode: { Light: { value: 60 } },
    });
  });

  it('parses px-string line heights and raw px font sizes', () => {
    expect(variable(model, 'semantic.typography.body.line-height').valuesByMode.Light).toEqual({
      value: 28,
    });
    // -0.01em × 17px = -0.17px
    expect(variable(model, 'semantic.typography.body.letter-spacing').valuesByMode.Light).toEqual({
      value: -0.17,
    });
    expect(variable(model, 'semantic.typography.caption.font-size').valuesByMode.Light).toEqual({
      value: 12,
    });
    // 0.06em × 12px = 0.72px; 1.5 × 12px = 18px
    expect(
      variable(model, 'semantic.typography.caption.letter-spacing').valuesByMode.Light,
    ).toEqual({ value: 0.72 });
    expect(variable(model, 'semantic.typography.caption.line-height').valuesByMode.Light).toEqual({
      value: 18,
    });
  });

  it('emits one text style per composite, bound to its variables', () => {
    expect(model.textStyles.map((s) => s.name)).toEqual([
      'typography/h1',
      'typography/body',
      'typography/caption',
    ]);
    expect(style('typography/h1')).toEqual({
      name: 'typography/h1',
      path: 'semantic.typography.h1',
      description: 'Page title.',
      fontFamily: 'Satoshi',
      fontStyle: 'Bold',
      fontWeight: 700,
      fontSize: 48,
      lineHeight: { unit: 'PIXELS', value: 60 },
      letterSpacing: { unit: 'PIXELS', value: -0.48 },
      textCase: 'ORIGINAL',
      boundVariables: {
        fontFamily: 'semantic.typography.h1.font-family',
        fontSize: 'semantic.typography.h1.font-size',
        fontWeight: 'semantic.typography.h1.font-weight',
        letterSpacing: 'semantic.typography.h1.letter-spacing',
        lineHeight: 'semantic.typography.h1.line-height',
      },
    });
  });

  it('carries textTransform as the text style case', () => {
    expect(style('typography/caption')).toMatchObject({
      fontFamily: 'Geist Mono',
      fontStyle: 'Medium',
      textCase: 'UPPER',
    });
  });
});

describe('buildFigmaModel — effect styles', () => {
  const model = buildFigmaModel(fixture);
  const style = (name) => model.effectStyles.find((s) => s.name === name);
  const shadowTint = (a) => ({
    r: expect.closeTo(0.1566, 4),
    g: expect.closeTo(0.1722, 4),
    b: expect.closeTo(0.2034, 4),
    a,
  });

  it('turns each CSS shadow layer into a Figma drop shadow tinted with the Light shadow color', () => {
    expect(style('shadow/subtle')).toEqual({
      name: 'shadow/subtle',
      path: 'semantic.shadow.subtle',
      description: 'Resting shadow.',
      tint: { token: 'primitive.shadow.color', mode: 'Light' },
      effects: [
        {
          type: 'DROP_SHADOW',
          color: shadowTint(0.04),
          offset: { x: 0, y: 1 },
          radius: 2,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL',
          showShadowBehindNode: false,
        },
        {
          type: 'DROP_SHADOW',
          color: shadowTint(0.06),
          offset: { x: 0, y: 4 },
          radius: 8,
          spread: -2,
          visible: true,
          blendMode: 'NORMAL',
          showShadowBehindNode: false,
        },
      ],
    });
  });

  it('gives each elevation its shadow effects and the fill/stroke variables it pairs with', () => {
    expect(model.effectStyles.map((s) => s.name)).toEqual([
      'shadow/subtle',
      'elevation/flat',
      'elevation/raised',
    ]);
    expect(style('elevation/flat')).toEqual({
      name: 'elevation/flat',
      path: 'semantic.elevation.flat',
      description: 'No shadow, hairline border.',
      tint: null,
      effects: [],
      pairsWith: {
        surface: 'semantic.color.surface.page',
        border: 'semantic.color.border.default',
      },
    });
    expect(style('elevation/raised')).toMatchObject({
      tint: { token: 'primitive.shadow.color', mode: 'Light' },
      effects: style('shadow/subtle').effects,
      pairsWith: { surface: 'semantic.color.surface.page', border: null },
    });
  });

  it('refuses a shadow it cannot parse', () => {
    const raw = { semantic: { shadow: { odd: { $type: 'shadow', $value: 'inherit' } } } };
    expect(() => buildFigmaModel(raw)).toThrow(/semantic\.shadow\.odd/);
  });
});

describe('validateFigmaModel — invariants', () => {
  /** A fresh fixture model with one mutation applied. */
  const mutated = (mutate) => {
    const model = buildFigmaModel(fixture);
    const find = (path) =>
      model.collections.flatMap((c) => c.variables).find((v) => v.path === path);
    mutate(model, find);
    return validateFigmaModel(model);
  };

  it('accepts the fixture model', () => {
    expect(validateFigmaModel(buildFigmaModel(fixture))).toEqual([]);
  });

  it.each([
    [
      'an alias to a variable that does not exist',
      (m, find) => (find('role.ring').valuesByMode.Default = { alias: 'semantic.color.nope' }),
      /role\.ring.*alias.*semantic\.color\.nope/,
    ],
    [
      'an alias across types',
      (m, find) =>
        (find('role.ring').valuesByMode.Default = { alias: 'semantic.space.component.gap' }),
      /role\.ring.*COLOR.*FLOAT/,
    ],
    [
      'a raw value of the wrong type',
      (m, find) => (find('primitive.space.4').valuesByMode.Default = { value: '16px' }),
      /primitive\.space\.4.*FLOAT/,
    ],
    [
      'a color channel outside 0–1',
      (m, find) =>
        (find('primitive.color.neutral.white').valuesByMode.Default = {
          value: { r: 255, g: 1, b: 1, a: 1 },
        }),
      /primitive\.color\.neutral\.white.*COLOR/,
    ],
    [
      'values that do not match the collection modes',
      (m, find) => delete find('semantic.color.surface.page').valuesByMode.Dark,
      /semantic\.color\.surface\.page.*modes/,
    ],
    [
      'more modes than a Professional plan allows',
      (m) => {
        const role = m.collections[3];
        role.modes = Array.from({ length: 11 }, (_, i) => `Brand ${i}`);
        for (const v of role.variables) {
          v.valuesByMode = Object.fromEntries(
            role.modes.map((mode) => [mode, v.valuesByMode.Default]),
          );
        }
      },
      /Hirobius\/Role.*11 modes.*10/,
    ],
    [
      'a second Light/Dark collection',
      (m) => {
        const component = m.collections[2];
        component.modes = ['Light', 'Dark'];
        for (const v of component.variables) {
          const { Default } = v.valuesByMode;
          v.valuesByMode = { Light: Default, Dark: Default };
        }
      },
      /Hirobius\/Semantic.*Hirobius\/Component.*one theme axis/,
    ],
    [
      'every Light/Dark variable collapsed to the same value (hds#252)',
      (m) => {
        const semantic = m.collections.find((c) => c.key === 'semantic');
        for (const v of semantic.variables) {
          v.valuesByMode = { Light: v.valuesByMode.Light, Dark: v.valuesByMode.Light };
        }
      },
      /Hirobius\/Semantic.*identical Light\/Dark values.*hds#252/,
    ],
    [
      'a scope that does not apply to the type',
      (m, find) => (find('semantic.color.surface.page').scopes = ['GAP']),
      /semantic\.color\.surface\.page.*GAP/,
    ],
    [
      'ALL_SCOPES combined with another scope',
      (m, find) =>
        (find('semantic.layout.grid.columns.desktop').scopes = ['ALL_SCOPES', 'OPACITY']),
      /grid\.columns\.desktop.*ALL_SCOPES/,
    ],
    [
      'ALL_FILLS combined with a specific fill',
      (m, find) => (find('semantic.accent.hover').scopes = ['ALL_FILLS', 'FRAME_FILL']),
      /semantic\.accent\.hover.*ALL_FILLS/,
    ],
    [
      'ALL_SCOPES outside the allow-list',
      (m, find) => (find('semantic.space.component.gap').scopes = ['ALL_SCOPES']),
      /semantic\.space\.component\.gap.*ALL_SCOPES.*allow-list/,
    ],
    [
      'a px-consuming scope on a value that is not px',
      (m, find) => (find('semantic.typography.h1.letter-spacing').unit = null),
      /h1\.letter-spacing.*LETTER_SPACING.*px/,
    ],
    [
      'a primitive published to consumers',
      (m, find) => (find('primitive.color.neutral.white').hiddenFromPublishing = false),
      /primitive\.color\.neutral\.white.*hidden/,
    ],
    [
      'the same name in two collections',
      (m, find) => (find('role.radius').name = 'radius/action'),
      /radius\/action.*Hirobius\/Semantic.*Hirobius\/Role/,
    ],
    [
      'a name that is also a group in its collection',
      (m, find) => (find('semantic.accent.hover').name = 'color/surface'),
      /color\/surface.*group/,
    ],
    [
      'a codeSyntax that is not the CSS var of the path',
      (m, find) => (find('semantic.radius.action').codeSyntax = { WEB: 'var(--radius)' }),
      /semantic\.radius\.action.*codeSyntax/,
    ],
    [
      'two variables with one codeSyntax (figma:push matches variables by it)',
      (m, find) => {
        const v = find('role.primary');
        v.path = 'role-radius';
        v.codeSyntax = { WEB: 'var(--role-radius)' };
      },
      /var\(--role-radius\) is used by role-radius and role\.radius/,
    ],
    [
      'a text style bound to a missing variable',
      (m) => (m.textStyles[0].boundVariables.fontSize = 'semantic.typography.h1.size'),
      /typography\/h1.*fontSize.*semantic\.typography\.h1\.size/,
    ],
    [
      'a text style bound to a variable of the wrong type',
      (m) => (m.textStyles[0].boundVariables.fontFamily = 'semantic.typography.h1.font-size'),
      /typography\/h1.*fontFamily.*STRING/,
    ],
    [
      'an effect style paired with a missing variable',
      (m) => (m.effectStyles[1].pairsWith.surface = 'semantic.color.surface.gone'),
      /elevation\/flat.*surface\.gone/,
    ],
    [
      'an effect with a non-numeric radius',
      (m) => (m.effectStyles[0].effects[0].radius = Number.NaN),
      /shadow\/subtle.*radius/,
    ],
  ])('flags %s', (_label, mutate, message) => {
    const violations = mutated(mutate);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(message);
  });
});

describe('buildFigmaModel — golden', () => {
  // Review a diff here as "what changes in Figma": regenerate with
  // `pnpm exec vitest run scripts/__tests__/figma-model.test.mjs -u`.
  it('matches the reviewed fixture model', async () => {
    const json = `${JSON.stringify(buildFigmaModel(fixture), null, 2)}\n`;
    await expect(json).toMatchFileSnapshot('./fixtures/figma-model/model.golden.json');
  });
});

describe('summarizeFigmaModel', () => {
  it('counts variables per collection, Light/Dark differences, styles and exclusions', () => {
    expect(summarizeFigmaModel(buildFigmaModel(fixture))).toEqual({
      collections: [
        { name: 'Hirobius/Primitives', modes: ['Default'], variables: 19 },
        { name: 'Hirobius/Semantic', modes: ['Light', 'Dark'], variables: 27 },
        { name: 'Hirobius/Component', modes: ['Default'], variables: 6 },
        { name: 'Hirobius/Role', modes: ['Default'], variables: 5 },
      ],
      variables: 57,
      // shadow.color, surface.page, content.primary, button.text (border.default is equal in both)
      themeDifferences: 4,
      textStyles: 3,
      effectStyles: 3,
      notInFigma: {
        motion: 4,
        'z-index': 1,
        breakpoints: 1,
        'motion-distance': 0,
        'relative-typography': 5,
        'text-measure': 1,
      },
    });
  });
});
