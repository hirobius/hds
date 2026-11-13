import { describe, expect, it } from 'vitest';
import tokensJson from '../../../../hirobius.tokens.json';
import { spaceScale } from '../generated-token-refs';

type SpaceToken = { $value?: { value: number; unit: string } };
const steps = tokensJson.primitive.space as unknown as Record<string, SpaceToken>;

// hds.space is generated from hirobius.tokens.json (hds#1525): one key per pixel
// step, named for its pixel value, mapped to that step's primitive var. The
// zero step and the 3px step were never in the public table.
// tier-ok: the test pins the generated table's own output, not a live declaration
const primitiveSpace = (step: string) => `var(--primitive-space-${step})`;

const OMITTED = new Set(['0', 'px3']);

describe('generated space table', () => {
  it('has one px key per primitive space step, pointing at that step', () => {
    const expected: Record<string, string> = {};
    for (const [step, tok] of Object.entries(steps)) {
      if (step.startsWith('$') || OMITTED.has(step)) continue;
      expected[`px${tok.$value!.value}`] = primitiveSpace(step);
    }
    expect(spaceScale).toEqual(expected);
  });

  it('keeps the 18 key to step pairs the hand-written tables held', () => {
    const pairs = [
      ['px1', 'px1'],
      ['px2', 'px2'],
      ['px4', '1'],
      ['px6', 'px6'],
      ['px8', '2'],
      ['px10', 'px10'],
      ['px12', '3'],
      ['px16', '4'],
      ['px20', '5'],
      ['px24', '6'],
      ['px28', '7'],
      ['px32', '8'],
      ['px40', '10'],
      ['px48', '12'],
      ['px64', '16'],
      ['px80', '20'],
      ['px96', '24'],
      ['px128', '32'],
    ];
    expect(Object.entries(spaceScale)).toEqual(pairs.map(([k, step]) => [k, primitiveSpace(step)]));
  });

  it('is typed as literals', () => {
    // tier-ok: literal-type assertion on the generated table
    const v: 'var(--primitive-space-1)' = spaceScale.px4;
    expect(v).toBe(primitiveSpace('1'));
  });
});
