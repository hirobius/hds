/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The tokens JSON split (budget: tokens JSON graph). `tokens` from /tokens ships the
 * values, `tokenDescriptions` from /tokens/descriptions every `$description`. Joined, they
 * must equal hirobius.tokens.json exactly, so no description is lost or invented.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripDescriptions, collectDescriptions, joinDescriptions } from '../lib/token-split.mjs';

const ROOT = resolve(import.meta.dirname, '../..');
const read = (f) => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'));
const source = read('hirobius.tokens.json');
const values = read('src/app/design-system/generated-tokens-values.json');
const descriptions = read('src/app/design-system/generated-tokens-descriptions.json');

describe('token split helpers', () => {
  const tree = {
    $description: 'root',
    a: {
      $description: 'group',
      b: { $value: 1, $description: 'leaf', $extensions: { x: { $description: 'kept' } } },
    },
  };
  it('strips $description outside $-keys and collects it by path', () => {
    expect(stripDescriptions(tree)).toEqual({
      a: { b: { $value: 1, $extensions: { x: { $description: 'kept' } } } },
    });
    expect(collectDescriptions(tree)).toEqual({ '': 'root', a: 'group', 'a.b': 'leaf' });
  });
  it('joins back to the original', () => {
    expect(joinDescriptions(stripDescriptions(tree), collectDescriptions(tree))).toEqual(tree);
  });
});

describe('the shipped split', () => {
  it('matches hirobius.tokens.json (run pnpm tokens if not)', () => {
    expect(values).toEqual(stripDescriptions(source));
    expect(descriptions).toEqual(collectDescriptions(source));
  });
  it('joins back to hirobius.tokens.json exactly', () => {
    expect(joinDescriptions(values, descriptions)).toEqual(source);
  });
  it('keeps no description in the values', () => {
    expect(JSON.stringify(collectDescriptions(values))).toBe('{}');
    expect(Object.keys(descriptions).length).toBeGreaterThan(500);
  });
});
