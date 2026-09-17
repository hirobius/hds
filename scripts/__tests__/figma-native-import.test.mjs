/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `pnpm figma:native-import` — the no-plugin fallback: DTCG files Figma's own
 * Variables ▸ Import reads, one file per collection × mode ("A new mode will
 * be created for each file you import").
 *
 * Seam: buildNativeImportFiles(model) (scripts/lib/figma-native-import.mjs).
 * Expected values are worked by hand from the fixture graph.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { buildNativeImportFiles } from '../lib/figma-native-import.mjs';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { FIXTURE_TOKENS_PATH, fixtureModel } from './helpers/figma-fixture.mjs';

const model = fixtureModel();
const files = buildNativeImportFiles(model);
const file = (path) => files.find((f) => f.path === path);
const leaf = (tokens, name) => name.split('/').reduce((node, segment) => node?.[segment], tokens);
const leafPaths = (node, prefix = []) =>
  Object.entries(node).flatMap(([key, child]) =>
    key.startsWith('$')
      ? []
      : '$value' in child
        ? [[...prefix, key].join('/')]
        : leafPaths(child, [...prefix, key]),
  );

describe('buildNativeImportFiles', () => {
  it('writes one file per collection × mode, in import order', () => {
    expect(files.map((f) => [f.path, f.collection, f.mode])).toEqual([
      ['01-primitive/Default.json', 'Hirobius/Primitives', 'Default'],
      ['02-semantic/Light.json', 'Hirobius/Semantic', 'Light'],
      ['02-semantic/Dark.json', 'Hirobius/Semantic', 'Dark'],
      ['03-component/Default.json', 'Hirobius/Component', 'Default'],
      ['04-role/Default.json', 'Hirobius/Role', 'Default'],
    ]);
  });

  it('gives every mode file of a collection the same tokens and types (Figma skips the rest)', () => {
    const light = file('02-semantic/Light.json').tokens;
    const dark = file('02-semantic/Dark.json').tokens;
    expect(leafPaths(dark)).toEqual(leafPaths(light));
    for (const name of leafPaths(light)) {
      expect(leaf(dark, name).$type, name).toBe(leaf(light, name).$type);
    }
  });

  it('writes colors as DTCG color objects with a hex fallback', () => {
    expect(leaf(file('01-primitive/Default.json').tokens, 'color/blue/500')).toEqual({
      $type: 'color',
      $value: {
        colorSpace: 'srgb',
        components: [0.117647, 0.180392, 0.992157],
        alpha: 1,
        hex: '#1e2efd',
      },
      $extensions: { 'com.figma.hiddenFromPublishing': true, 'com.figma.scopes': [] },
    });
  });

  it('writes px dimensions as { value, unit: "px" }, other numbers as number, families as fontFamily', () => {
    const primitives = file('01-primitive/Default.json').tokens;
    expect(leaf(primitives, 'size/width/50ch').$value).toEqual({ value: 589.05, unit: 'px' });
    expect(leaf(primitives, 'size/width/50ch').$type).toBe('dimension');
    expect(leaf(primitives, 'typography/weight/bold')).toMatchObject({
      $type: 'number',
      $value: 700,
    });
    expect(leaf(primitives, 'typography/family/mono')).toMatchObject({
      $type: 'fontFamily',
      $value: 'Geist Mono',
    });
  });

  it('references a variable in the same collection with a DTCG alias', () => {
    const light = file('02-semantic/Light.json').tokens;
    expect(leaf(light, 'button/text').$value).toBe('{color.content.primary}');
    expect(leaf(file('02-semantic/Dark.json').tokens, 'button/text').$value).toBe(
      '{color.surface.page}',
    );
  });

  it('references another collection with com.figma.aliasData, keeping the resolved value for that mode', () => {
    const dark = leaf(file('02-semantic/Dark.json').tokens, 'color/surface/page');
    expect(dark.$value).toEqual({
      colorSpace: 'srgb',
      components: [0, 0, 0],
      alpha: 1,
      hex: '#000000',
    });
    expect(dark.$extensions['com.figma.aliasData']).toEqual({
      targetVariableSetName: 'Hirobius/Primitives',
      targetVariableName: 'color/neutral/black',
    });
    // Component has one mode, so an alias into Semantic resolves through its first mode (Light).
    const bg = leaf(file('03-component/Default.json').tokens, 'button/bg');
    expect(bg.$extensions['com.figma.aliasData']).toEqual({
      targetVariableSetName: 'Hirobius/Semantic',
      targetVariableName: 'color/surface/accent',
    });
    expect(bg.$value.hex).toBe('#1e2efd');
  });

  it('carries descriptions and scopes', () => {
    const h1Size = leaf(file('02-semantic/Light.json').tokens, 'typography/h1/line-height');
    expect(h1Size.$description).toBe('Page title. Converted from 1.25 × 48px.');
    expect(h1Size.$extensions['com.figma.scopes']).toEqual(['LINE_HEIGHT']);
  });

  it('refuses a variable name DTCG cannot hold as a group path', () => {
    const bad = JSON.parse(JSON.stringify(model));
    bad.collections[0].variables[0].name = 'space/0.5';
    expect(() => buildNativeImportFiles(bad)).toThrow(/space\/0\.5.*"\.".*DTCG/);
  });
});

/** Every cross-collection alias in a file: [variable name, target collection, target variable]. */
const crossAliases = (tokens, prefix = []) =>
  Object.entries(tokens).flatMap(([key, child]) => {
    if (key.startsWith('$')) return [];
    if (!('$value' in child)) return crossAliases(child, [...prefix, key]);
    const alias = child.$extensions['com.figma.aliasData'];
    return alias
      ? [[[...prefix, key].join('/'), alias.targetVariableSetName, alias.targetVariableName]]
      : [];
  });

describe('buildNativeImportFiles with Brand and Density', () => {
  // A demo tenant with a sharp radius (Brand's base mode aliases Semantic) and a
  // Compact gap (Semantic aliases Density, which aliases Brand): aliases both ways.
  const sharp = {
    slug: 'sharp-demo',
    overlay: {
      role: { radius: { $type: 'dimension', $value: { value: 0, unit: 'px' } } },
      semantic: {
        space: {
          $type: 'dimension',
          component: {
            gap: {
              $value: '{primitive.space.4}',
              $extensions: {
                'com.figma.variables': { modes: { Compact: '{primitive.space.2}' } },
              },
            },
          },
        },
      },
    },
  };
  const model = buildFigmaModel(JSON.parse(readFileSync(FIXTURE_TOKENS_PATH, 'utf8')), {
    brands: { baseMode: 'Hirobius', tenants: [sharp] },
  });
  const branded = buildNativeImportFiles(model);
  const importOrder = [...new Set(branded.map((f) => f.collection))];

  it('imports Brand and Density right after Primitives, before the collections that alias them', () => {
    expect(branded.map((f) => f.path)).toEqual([
      '01-primitive/Default.json',
      '02-brand/Hirobius.json',
      '02-brand/sharp-demo.json',
      '03-density/Comfortable.json',
      '03-density/Compact.json',
      '04-semantic/Light.json',
      '04-semantic/Dark.json',
      '05-component/Default.json',
      '06-role/Default.json',
    ]);
  });

  it('points every cross-collection alias at an earlier file, except the Brand base-mode aliases it reports', () => {
    const forward = [];
    for (const f of branded) {
      for (const [name, target, targetName] of crossAliases(f.tokens)) {
        if (importOrder.indexOf(target) >= importOrder.indexOf(f.collection)) {
          forward.push({ file: f.path, variable: name, target, targetVariable: targetName });
        }
      }
    }
    expect(forward).toEqual([
      {
        file: '02-brand/Hirobius.json',
        variable: 'role/radius',
        target: 'Hirobius/Semantic',
        targetVariable: 'radius/action',
      },
    ]);
    expect(branded.flatMap((f) => f.forwardAliases.map((a) => ({ file: f.path, ...a })))).toEqual(
      forward,
    );
  });

  it('keeps the axes: Semantic and Role alias Density and Brand, so switching a mode still changes them', () => {
    const semantic = crossAliases(branded.find((f) => f.path === '04-semantic/Light.json').tokens);
    expect(semantic).toContainEqual([
      'space/component/gap',
      'Hirobius/Density',
      'semantic/space/component/gap',
    ]);
    expect(
      crossAliases(branded.find((f) => f.path === '06-role/Default.json').tokens),
    ).toContainEqual(['radius', 'Hirobius/Brand', 'role/radius']);
  });
});
