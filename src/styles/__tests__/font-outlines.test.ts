/**
 * Contract test: the static brand faces ship overlap-free outlines.
 *
 * Google Fonts cuts static Sora instances from the variable master without
 * removing overlaps, so glyphs such as "A" carry self-crossing contours. Core
 * Text on macOS draws those as a notch at the apex of the A; FreeType on Linux
 * hides it. The fix is to flatten the overlaps in the file we ship.
 *
 * Plus Jakarta Sans is variable, where overlaps are part of the design, so it is
 * out of scope here.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { hasOverlap, readGlyphs, type Contour } from './glyph-outlines';

const ROOT = resolve(__dirname, '../../..');
// IBM Plex Mono 400 is static too and already overlap-free (checked when this
// test landed); it stays on the smaller transformed encoding the reader cannot open.
const STATIC_FACES = ['public/fonts/sora/sora-700.woff2'];

describe('static font outlines', () => {
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

  for (const face of STATIC_FACES) {
    it(`${face} has no overlapping or self-crossing contours`, () => {
      const glyphs = readGlyphs(readFileSync(resolve(ROOT, face)));
      expect(glyphs.size).toBeGreaterThan(100);
      const overlapping = [...glyphs]
        .filter(([, contours]) => hasOverlap(contours))
        .map(([id]) => id);
      expect(overlapping, 'glyph ids with overlaps').toEqual([]);
    });
  }
});
