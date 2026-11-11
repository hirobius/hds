/**
 * Contract test: the Sora face fills its overlapping contours on every renderer.
 *
 * Sora ships as one variable file, where overlaps are part of the design, so
 * glyphs such as "A" carry self-crossing contours. Core Text on macOS draws
 * those as a notch at the apex of the A unless the glyph sets OVERLAP_SIMPLE
 * (bit 6 of its first point's flags); FreeType on Linux hides it. The shipped
 * file sets the bit on every simple glyph (recipe in src/styles/fonts.css).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { hasOverlap, readFirstFlags, readGlyphs, type Contour } from './glyph-outlines';

const ROOT = resolve(__dirname, '../../..');
const SORA = 'public/fonts/sora/sora-variable.woff2';
const OVERLAP_SIMPLE = 0x40;

describe('Sora font outlines', () => {
  it('flags the self-crossing apex of the upstream Sora 800 "A"', () => {
    // Outer contour and crossbar of "A" in the Google Fonts static cut (fontsource 5.3.0).
    const upstreamA: Contour[] = [
      [
        [8, 0],
        [242, 730],
        [540, 730],
        [782, 0],
        [590, 0],
        [402, 600],
        [455, 580],
        [323, 580],
        [377, 600],
        [194, 0],
      ],
      [
        [199, 169],
        [255, 321],
        [532, 321],
        [588, 169],
      ],
    ];
    expect(hasOverlap(upstreamA)).toBe(true);
    expect(hasOverlap([upstreamA[1]])).toBe(false);
  });

  it(`${SORA} sets OVERLAP_SIMPLE on every glyph with overlapping contours`, () => {
    const file = readFileSync(resolve(ROOT, SORA));
    const glyphs = readGlyphs(file);
    const flags = readFirstFlags(file);
    expect(glyphs.size).toBeGreaterThan(100);
    const overlapping = [...glyphs].filter(([, contours]) => hasOverlap(contours));
    expect(overlapping.length, 'the variable master keeps its overlaps').toBeGreaterThan(0);
    const unflagged = overlapping
      .filter(([id]) => !((flags.get(id) ?? 0) & OVERLAP_SIMPLE))
      .map(([id]) => id);
    expect(unflagged, 'glyph ids with overlaps and no OVERLAP_SIMPLE').toEqual([]);
  });
});
