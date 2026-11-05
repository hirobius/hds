/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Figma component contracts (owner decision 2026-11-05): Button drops `iconOnly`, and
 * icon-only buttons get their own IconButton contract with no link variant. The contracts
 * are generated from code (src/app/data/component-api.json), so code stays the source of
 * truth; the committed figma/contracts/*.json must match what the generator builds.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildContracts,
  findMissingVariables,
  findStaleContracts,
  serializeContract,
} from '../check-figma-components.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const api = {
  components: {
    Button: {
      filePath: 'src/app/components/button.tsx',
      props: [
        { name: 'variant', type: '"link" | "primary" | "secondary" | "tertiary" | null' },
        { name: 'size', type: '"sm" | "md" | "lg" | null' },
        {
          name: 'tone',
          type: '"success" | "danger" | "warning" | "info" | "neutral" | "quiet" | null',
        },
        { name: 'iconOnly', type: 'boolean' },
        { name: 'loading', type: 'boolean' },
      ],
    },
  },
};

describe('buildContracts', () => {
  const { Button, IconButton } = buildContracts(api);

  it('Button has no iconOnly property and keeps the link variant', () => {
    const names = Object.keys(Button.properties);
    expect(names.some((n) => /icon\s*only/i.test(n))).toBe(false);
    expect(Button.properties.Variant.values).toEqual(['primary', 'secondary', 'tertiary', 'link']);
  });

  it('IconButton is Variant [primary, secondary, tertiary] x Size x State', () => {
    expect(IconButton.properties.Variant).toEqual({
      type: 'VARIANT',
      values: ['primary', 'secondary', 'tertiary'],
    });
    expect(IconButton.properties.Size.values).toEqual(['sm', 'md', 'lg']);
    expect(IconButton.properties.State.values).toEqual(['rest', 'hover', 'pressed', 'disabled']);
    expect(IconButton.variantCount).toBe(36);
  });

  it('IconButton has Focus and Loading booleans and an Icon instance swap', () => {
    expect(IconButton.properties.Focus).toEqual({ type: 'BOOLEAN', default: false });
    expect(IconButton.properties.Loading).toEqual({ type: 'BOOLEAN', default: false });
    expect(IconButton.properties.Icon).toEqual({ type: 'INSTANCE_SWAP' });
  });

  it('IconButton takes the Button tone variable modes, neutral first', () => {
    expect(IconButton.variableModes).toEqual({
      'Button tone': ['neutral', 'quiet', 'success', 'danger', 'warning', 'info'],
    });
  });

  it('IconButton binds a square root to size height, padding 0, and an Icon layer to iconSize', () => {
    for (const s of ['sm', 'md', 'lg']) {
      expect(IconButton.sizes[s].root).toEqual({
        width: `button/size/${s}/height`,
        height: `button/size/${s}/height`,
        padding: 0,
      });
      expect(IconButton.sizes[s].layers).toEqual({
        Icon: { width: `button/size/${s}/iconSize`, height: `button/size/${s}/iconSize` },
      });
    }
  });

  it('a link variant on IconButton is impossible even if code adds one later', () => {
    const more = structuredClone(api);
    more.components.Button.props[0].type = '"link" | "primary" | "ghost" | null';
    expect(buildContracts(more).IconButton.properties.Variant.values).toEqual(['primary', 'ghost']);
  });

  it('throws when the Button props are missing, so a renamed prop cannot pass silently', () => {
    expect(() => buildContracts({ components: {} })).toThrow(/Button/);
  });
});

describe('findMissingVariables', () => {
  const contracts = buildContracts(api);
  const collections = (names, extra = []) => [
    { name: 'Hirobius/Component', variables: names.map((name) => ({ name })) },
    ...extra,
  ];
  const all = ['sm', 'md', 'lg'].flatMap((s) =>
    ['height', 'iconSize', 'paddingX'].map((k) => `button/size/${s}/${k}`),
  );

  it('reports nothing when every bound variable and the tone collection exist', () => {
    const snap = collections(all, [
      {
        name: 'Button tone',
        modes: ['neutral', 'quiet', 'success', 'danger', 'warning', 'info'].map((name) => ({
          name,
        })),
        variables: [],
      },
    ]);
    expect(findMissingVariables(contracts, snap)).toEqual([]);
  });

  it('names a missing variable and a missing mode collection', () => {
    const snap = collections(all.filter((n) => n !== 'button/size/sm/iconSize'));
    const found = findMissingVariables(contracts, snap);
    expect(found).toContain('IconButton: variable button/size/sm/iconSize is not in the snapshot');
    expect(found).toContain('IconButton: variable collection "Button tone" is not in the snapshot');
  });
});

describe('the committed contracts', () => {
  it('match what the generator builds from component-api.json', () => {
    const built = buildContracts(readJson('src/app/data/component-api.json'));
    const read = (name) => readFileSync(join(ROOT, 'figma/contracts', `${name}.json`), 'utf8');
    expect(findStaleContracts(built, read)).toEqual([]);
    expect(read('IconButton')).toBe(serializeContract(built.IconButton));
  });
});
