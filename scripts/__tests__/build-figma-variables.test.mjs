/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The legacy Figma exports (`pnpm figma-variables`) are projections of the
 * Figma model, so they inherit its Light/Dark values instead of re-deriving
 * them from the token file.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { toPluginFormat, toRestPayload } from '../build-figma-variables.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(HERE, 'fixtures', 'figma-model', 'tokens.json'), 'utf8'),
);
const model = buildFigmaModel(fixture);

describe('toPluginFormat', () => {
  const plugin = toPluginFormat(model);
  const pluginVar = (collection, name) =>
    plugin.collections.find((c) => c.name === collection).variables.find((v) => v.name === name);

  it('mirrors the model collections and modes', () => {
    expect(plugin.collections.map((c) => [c.name, c.modes])).toEqual([
      ['Hirobius/Primitives', ['Default']],
      ['Hirobius/Semantic', ['Light', 'Dark']],
      ['Hirobius/Component', ['Light', 'Dark']],
      ['Hirobius/Role', ['Default']],
    ]);
  });

  it('writes aliases as collection + variable name, per mode', () => {
    expect(pluginVar('Hirobius/Semantic', 'color/surface/page').valuesByMode).toEqual({
      Light: { aliasCollection: 'Hirobius/Primitives', aliasVariable: 'color/neutral/white' },
      Dark: { aliasCollection: 'Hirobius/Primitives', aliasVariable: 'color/neutral/black' },
    });
    expect(pluginVar('Hirobius/Role', 'background').valuesByMode).toEqual({
      Default: { aliasCollection: 'Hirobius/Semantic', aliasVariable: 'color/surface/page' },
    });
  });

  it('writes raw values as Figma values', () => {
    expect(pluginVar('Hirobius/Primitives', 'space/4')).toMatchObject({
      resolvedType: 'FLOAT',
      scopes: [],
      codeSyntax: { WEB: 'var(--primitive-space-4)' },
      valuesByMode: { Default: 16 },
    });
  });
});

describe('toRestPayload', () => {
  const payload = toRestPayload(model);

  it('creates each collection with its initial mode and renames that mode instead of creating it twice', () => {
    const semantic = payload.variableCollections.find((c) => c.name === 'Hirobius/Semantic');
    const modes = payload.variableModes.filter((m) => m.variableCollectionId === semantic.id);
    expect(modes).toEqual([
      {
        action: 'UPDATE',
        id: semantic.initialModeId,
        name: 'Light',
        variableCollectionId: semantic.id,
      },
      { action: 'CREATE', id: expect.any(String), name: 'Dark', variableCollectionId: semantic.id },
    ]);
    const created = payload.variableModes.filter((m) => m.action === 'CREATE').map((m) => m.id);
    const initial = payload.variableCollections.map((c) => c.initialModeId);
    expect(created.filter((id) => initial.includes(id))).toEqual([]);
    expect(new Set([...created, ...initial]).size).toBe(created.length + initial.length);
  });

  it('sets a value for every variable in every mode, with distinct Dark values', () => {
    const variableCount = model.collections.reduce(
      (n, c) => n + c.variables.length * c.modes.length,
      0,
    );
    expect(payload.variableModeValues).toHaveLength(variableCount);
    const page = payload.variables.find((v) => v.name === 'color/surface/page');
    const pageValues = payload.variableModeValues.filter((mv) => mv.variableId === page.id);
    expect(pageValues.map((mv) => mv.value)).toEqual([
      {
        type: 'VARIABLE_ALIAS',
        id: payload.variables.find((v) => v.name === 'color/neutral/white').id,
      },
      {
        type: 'VARIABLE_ALIAS',
        id: payload.variables.find((v) => v.name === 'color/neutral/black').id,
      },
    ]);
  });
});
