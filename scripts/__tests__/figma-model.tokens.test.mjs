/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The Figma model built from the real hirobius.tokens.json.
 *
 * Expectations are derived from the token file with a walker local to this
 * test (it reads `$extensions['com.figma.variables'].modes` directly), never
 * from the exporter's own output, so a regression in the exporter cannot move
 * its own goalposts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildFigmaModel, NOT_IN_FIGMA } from '../lib/figma-model.mjs';
import { validateFigmaModel } from '../lib/figma-model-invariants.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const raw = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));

// ── Independent reading of the token file ────────────────────────────────────
const leaves = [];
(function walk(node, path, type) {
  if (!node || typeof node !== 'object') return;
  const ownType = node.$type ?? type;
  if ('$value' in node) {
    leaves.push({
      path: path.join('.'),
      type: ownType,
      value: node.$value,
      extensions: node.$extensions,
    });
    return;
  }
  for (const [key, child] of Object.entries(node))
    if (!key.startsWith('$')) walk(child, [...path, key], ownType);
})(raw, [], undefined);

const themeModes = (leaf) => leaf.extensions?.['com.figma.variables']?.modes;
const differsByTheme = (leaf) => {
  const modes = themeModes(leaf);
  if (!modes) return false;
  return JSON.stringify(modes.Light ?? leaf.value) !== JSON.stringify(modes.Dark ?? leaf.value);
};
const expectedThemeDiffs = leaves.filter(differsByTheme).length;
const roleTokens = leaves.filter((l) => l.path.startsWith('role.'));

// ── The model under test ─────────────────────────────────────────────────────
const model = buildFigmaModel(raw);
const variables = model.collections.flatMap((c) =>
  c.variables.map((v) => ({ ...v, collection: c })),
);

describe('Figma model of hirobius.tokens.json', () => {
  it('passes every invariant (types, units, scopes, hidden primitives, unique names)', () => {
    expect(validateFigmaModel(model)).toEqual([]);
  });

  it(`has exactly ${expectedThemeDiffs} variables whose Light and Dark values differ`, () => {
    expect(expectedThemeDiffs).toBeGreaterThan(0);
    const diffs = variables.filter(
      (v) =>
        'Dark' in v.valuesByMode &&
        JSON.stringify(v.valuesByMode.Light) !== JSON.stringify(v.valuesByMode.Dark),
    );
    expect(diffs.map((v) => v.path).sort()).toEqual(
      leaves
        .filter(differsByTheme)
        .map((l) => l.path)
        .sort(),
    );
  });

  it('reads each Dark value from the token file, not from Light', () => {
    for (const leaf of leaves.filter(differsByTheme)) {
      const dark = themeModes(leaf).Dark;
      const v = variables.find((x) => x.path === leaf.path);
      if (typeof dark === 'string' && dark.startsWith('{')) {
        expect(v.valuesByMode.Dark).toEqual({ alias: dark.slice(1, -1) });
      } else {
        expect(v.valuesByMode.Dark).toHaveProperty('value');
      }
    }
  });

  it(`has a Role collection with all ${roleTokens.length} role.* tokens`, () => {
    const role = model.collections.find((c) => c.key === 'role');
    expect(role.name).toBe('Hirobius/Role');
    expect(role.variables.map((v) => v.path)).toEqual(roleTokens.map((l) => l.path));
  });

  it('emits a text style per typography composite and an effect style per shadow and elevation', () => {
    expect(model.textStyles.map((s) => s.path)).toEqual(
      leaves.filter((l) => l.type === 'typography').map((l) => l.path),
    );
    expect(model.effectStyles.map((s) => s.path)).toEqual(
      leaves.filter((l) => l.type === 'shadow' || l.type === 'elevation').map((l) => l.path),
    );
  });
});

describe('not-in-Figma accounting', () => {
  const declared = new Map(model.notInFigma.flatMap((e) => e.tokens.map((t) => [t, e.id])));
  const styled = new Set([...model.textStyles, ...model.effectStyles].map((s) => s.path));
  const exported = new Set(variables.map((v) => v.path));

  it('accounts for every token exactly once: variable, style, or declared exclusion', () => {
    const unaccounted = [];
    const doubled = [];
    for (const leaf of leaves) {
      const homes = [
        exported.has(leaf.path),
        styled.has(leaf.path),
        declared.has(leaf.path),
      ].filter(Boolean);
      if (homes.length === 0) unaccounted.push(leaf.path);
      if (homes.length > 1) doubled.push(leaf.path);
    }
    expect(unaccounted).toEqual([]);
    expect(doubled).toEqual([]);
  });

  it('accounts for every typography composite key: bound variable, text case, or declared exclusion', () => {
    for (const leaf of leaves.filter((l) => l.type === 'typography')) {
      const style = model.textStyles.find((s) => s.path === leaf.path);
      for (const key of Object.keys(leaf.value)) {
        const home =
          key in style.boundVariables || (key === 'textTransform' && style.textCase !== 'ORIGINAL')
            ? 'style'
            : declared.get(`${leaf.path}.${key}`);
        expect(home, `${leaf.path}.${key}`).toBeTruthy();
      }
    }
  });

  it.each(NOT_IN_FIGMA.map((e) => [e.id]))(
    '%s still matches at least one token, with a reason',
    (id) => {
      const entry = model.notInFigma.find((e) => e.id === id);
      expect(entry.tokens.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(40);
    },
  );
});
