/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/audit-figma-pixels.mjs: the pure parts (variant names, crop,
 * compare, the generated read-only geometry script) and the committed inputs.
 * The browser render itself runs on demand (pnpm audit:figma-pixels).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseVariant, crop, compare, buildGeometryScript } from '../audit-figma-pixels.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const solid = (w, h, rgba) => {
  const p = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) p.data.set(rgba, i * 4);
  return p;
};

describe('audit-figma-pixels', () => {
  it('reads a Figma variant name as props', () => {
    expect(parseVariant('Variant=primary, Size=md, State=hover')).toEqual({
      variant: 'primary',
      size: 'md',
      state: 'hover',
    });
  });

  it('crops a box, transparent outside the source', () => {
    const src = solid(4, 4, [255, 0, 0, 255]);
    const c = crop(src, 2, 2, 4, 4);
    expect([c.width, c.height]).toEqual([4, 4]);
    expect([...c.data.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...c.data.subarray((3 * 4 + 3) * 4, (3 * 4 + 3) * 4 + 4)]).toEqual([0, 0, 0, 0]);
  });

  it('same pixels compare at 0%; a different fill at 100%; sizes are kept', () => {
    const a = solid(10, 10, [10, 20, 30, 255]);
    expect(compare(a, solid(10, 10, [10, 20, 30, 255])).diffPercent).toBe(0);
    expect(compare(a, solid(10, 10, [250, 250, 250, 255])).diffPercent).toBe(100);
    const c = compare(a, solid(12, 10, [10, 20, 30, 255]));
    expect(c.sizeCode).toEqual([10, 10]);
    expect(c.sizeFigma).toEqual([12, 10]);
  });

  it('the geometry script reads the parity sets in the library only', () => {
    const s = buildGeometryScript();
    expect(s).toContain("figma.fileKey !== '2VgBbVpKiDnu0aftJEVyBQ'");
    expect(s).toContain('"2399:11077"');
    expect(s).toContain('"2399:26744"');
    expect(s).not.toMatch(/\.(set\w+|remove|createComponent|appendChild)\(/);
  });

  it('each committed Figma render matches its geometry (scale 1 or 2)', () => {
    for (const n of ['Button', 'IconButton']) {
      const geo = JSON.parse(readFileSync(path.join(REPO, `figma/pixels/${n}.geometry.json`)));
      const png = PNG.sync.read(readFileSync(path.join(REPO, `figma/pixels/${n}.png`)));
      const k = png.width / geo.render.width;
      expect([1, 2], n).toContain(k);
      expect(png.height, n).toBe(Math.round(geo.render.height * k));
      expect(geo.variants.length, n).toBe(n === 'Button' ? 48 : 36);
    }
  });
});
