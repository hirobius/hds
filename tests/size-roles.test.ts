/**
 * hds#482 — components size through `semantic.size` roles, never `primitive.size`
 * directly, and the docs say when to reach for `size` versus `space`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const COMPONENTS = join(ROOT, 'src/app/components');
const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));

describe('size roles (hds#482)', () => {
  it('no shipped component references a --primitive-size-<step> variable', () => {
    const offenders = readdirSync(COMPONENTS)
      .filter((f) => f.endsWith('.tsx') && !/\.(test|spec|stories)\.tsx$/.test(f))
      .filter((f) => readFileSync(join(COMPONENTS, f), 'utf8').match(/--primitive-size-\d/));
    expect(offenders).toEqual([]);
  });

  it('size and space token descriptions state which scale is for what', () => {
    for (const d of [
      tokens.primitive.size.$description,
      tokens.semantic.size.$description,
      tokens.semantic.space.$description,
    ]) {
      expect(d).toMatch(/size/i);
      expect(d).toMatch(/space/i);
    }
  });

  it('CONSUMING.md has a size-vs-space rule', () => {
    expect(readFileSync(join(ROOT, 'docs/CONSUMING.md'), 'utf8')).toMatch(/size vs\.? space/i);
  });
});
