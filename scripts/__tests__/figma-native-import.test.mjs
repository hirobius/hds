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
import { buildNativeImportFiles } from '../lib/figma-native-import.mjs';
import { fixtureModel } from './helpers/figma-fixture.mjs';

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
