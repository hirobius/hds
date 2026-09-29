/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
//
// hirobius.tokens.json is strict W3C DTCG on disk (it ships in the npm package,
// so any DTCG tool must read it). HDS keeps three composites DTCG has no type
// for: `motion` (duration + easing, expanded to --hds-motion-*), `spring`
// easings, and `elevation` (surface + shadow + border). They live under
// $extensions["com.hirobius.hds"] on disk, and fromDtcg() hands every build
// script the HDS form it has always read, so generated output does not move.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fromDtcg, HDS_NAMESPACE } from '../lib/token-dialect.mjs';
import { readTokenSource } from '../lib/token-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const disk = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));

// DTCG Format Module 2025.10, §8 (types) and §9 (composite types).
const DTCG_TYPES = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
]);

function* nodes(node, path = [], inheritedType = null) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const type = node.$type ?? inheritedType;
  yield { node, path, type };
  if ('$value' in node) return;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    yield* nodes(child, [...path, key], type);
  }
}

const tokenAt = (root, dotted) => {
  let hit = null;
  for (const n of nodes(root)) if (n.path.join('.') === dotted && '$value' in n.node) hit = n;
  return hit;
};

describe('hirobius.tokens.json on disk is strict DTCG', () => {
  it('declares only DTCG types', () => {
    const offenders = [];
    for (const { node, path } of nodes(disk)) {
      if ('$type' in node && !DTCG_TYPES.has(node.$type))
        offenders.push(`${path.join('.') || '(root)'}: ${node.$type}`);
    }
    expect(offenders).toEqual([]);
  });

  it('gives every alias the type of the token it points at', () => {
    const mismatches = [];
    for (const { node, path, type } of nodes(disk)) {
      if (!('$value' in node)) continue;
      const v = node.$value;
      if (typeof v !== 'string' || !/^\{[^}]+\}$/.test(v)) continue;
      const target = tokenAt(disk, v.slice(1, -1));
      if (target && target.type !== type)
        mismatches.push(`${path.join('.')} (${type}) -> ${v} (${target.type})`);
    }
    expect(mismatches).toEqual([]);
  });
});

describe('fromDtcg', () => {
  const hds = fromDtcg(disk);

  it('reads a spring easing back from its extension', () => {
    expect(hds.primitive.easing.elastic).toEqual({
      $type: 'spring',
      $value: { type: 'spring', stiffness: 300, damping: 20, mass: 1 },
      $description: 'Spring response defined by stiffness, damping, and mass parameters.',
    });
  });

  it('reads a DTCG transition marked as HDS motion back as duration + easing', () => {
    expect(hds.semantic.motion.$type).toBe('motion');
    expect(hds.semantic.motion.expressive).toEqual({
      $value: { duration: '{primitive.duration.medium}', easing: '{primitive.easing.elastic}' },
      $description:
        'For teaching moments and significant UI entries. Includes physics-based squish.',
    });
    expect(hds.semantic.motion.distance.$type).toBe('dimension');
  });

  it('reads elevation levels back from their extensions', () => {
    expect(hds.semantic.elevation.$type).toBe('elevation');
    expect(hds.semantic.elevation.flat).toEqual({
      $value: {
        surface: '{semantic.color.surface.page}',
        shadow: null,
        border: '{semantic.color.border.subtle}',
      },
      $description: 'Flat surface (no shadow, hairline border) for embedded panels.',
    });
  });

  it('leaves no HDS extension behind', () => {
    const left = [];
    for (const { node, path } of nodes(hds))
      if (node.$extensions && HDS_NAMESPACE in node.$extensions) left.push(path.join('.'));
    expect(left).toEqual([]);
  });

  it('leaves tokens without the extension untouched', () => {
    expect(hds.component.tag.radius).toEqual(disk.component.tag.radius);
    expect(hds.semantic.color).toEqual(disk.semantic.color);
  });

  it('does not mutate its input', () => {
    const copy = structuredClone(disk);
    fromDtcg(copy);
    expect(copy).toEqual(disk);
  });

  it('refuses a motion transition with a delay, which the HDS form cannot carry', () => {
    const raw = {
      motion: {
        $type: 'transition',
        $extensions: { [HDS_NAMESPACE]: { $type: 'motion' } },
        slow: {
          $value: {
            duration: { value: 400, unit: 'ms' },
            delay: { value: 50, unit: 'ms' },
            timingFunction: [0, 0, 1, 1],
          },
        },
      },
    };
    expect(() => fromDtcg(raw)).toThrow(/motion\.slow.*delay/);
  });

  it('readTokenSource reads a file into the HDS form', () => {
    expect(readTokenSource(join(ROOT, 'hirobius.tokens.json'))).toEqual(hds);
  });
});
