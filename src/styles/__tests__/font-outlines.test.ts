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
import { hasOverlap, readGlyphs } from './glyph-outlines';

const ROOT = resolve(__dirname, '../../..');
// IBM Plex Mono 400 is static too and already overlap-free (checked when this
// test landed); it stays on the smaller transformed encoding the reader cannot open.
const STATIC_FACES = ['public/fonts/sora/sora-800.woff2'];

describe('static font outlines', () => {
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
