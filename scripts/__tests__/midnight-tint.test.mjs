import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hexToOklch } from '../lib/raised-edge.mjs';
import {
  MIDNIGHT_HUE,
  SOURCE,
  midnightChroma,
  midnightTint,
  NEUTRAL_BLACK,
} from '../lib/midnight-tint.mjs';

const root = resolve(import.meta.dirname, '../..');
const tokens = JSON.parse(readFileSync(resolve(root, 'hirobius.tokens.json'), 'utf8'));
const ramp = (name) => tokens.primitive.color[name];

// hds#755: graphite and neutral lean toward a midnight hue; each step keeps its grey's lightness.
describe('midnight tint (hds#755)', () => {
  for (const name of ['graphite', 'neutral']) {
    describe(name, () => {
      for (const [step, source] of Object.entries(SOURCE[name])) {
        if (step === 'white' || step === 'black') continue;
        it(`${name}.${step} keeps L ±0.002 and the chroma formula`, () => {
          const value = ramp(name)[step].$value;
          const got = hexToOklch(value);
          const want = hexToOklch(source);
          expect(Math.abs(got.l - want.l)).toBeLessThanOrEqual(0.002);
          expect(Math.abs(got.c - midnightChroma(name, step, want.l))).toBeLessThanOrEqual(0.0015);
          expect(((got.h % 360) + 360) % 360).toBeCloseTo(MIDNIGHT_HUE, -1);
          expect(value).toBe(midnightTint(name, step, source));
        });
      }
    });
  }

  it('graphite chroma is 0.036 × weight', () => {
    expect(midnightChroma('graphite', '800')).toBeCloseTo(0.036, 6);
    expect(midnightChroma('graphite', '50')).toBeCloseTo(0.036 * 0.15, 6);
    expect(midnightChroma('graphite', '950')).toBeCloseTo(0.036 * 0.9, 6);
  });

  it('neutral chroma is 0.022 × min(1, max(0.12, 1−L) × 1.25)', () => {
    expect(midnightChroma('neutral', '50', 0.98)).toBeCloseTo(0.022 * 0.15, 6);
    expect(midnightChroma('neutral', '700', 0.4)).toBeCloseTo(0.022 * 0.75, 6);
    expect(midnightChroma('neutral', '950', 0.1)).toBeCloseTo(0.022, 6);
  });

  it('white stays #ffffff; black becomes oklch(0.145 0.022 262) = #060a13', () => {
    expect(ramp('neutral').white.$value).toBe('#ffffff');
    expect(NEUTRAL_BLACK).toBe('#060a13');
    expect(ramp('neutral').black.$value).toBe('#060a13');
  });
});
