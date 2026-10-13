/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Screenshot sizing for the explorations board (hirobius/hds#628).
 *
 * A board inlines every screenshot as a data URI, and an Artifact page may not
 * pass 16 MB. `fitImages` decides which screenshots shrink and by how much; the
 * board tests cover it end to end, these cover the choices it makes.
 */
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import {
  SCALE_STEPS,
  downscalePng,
  fitImages,
  pngSize,
} from '../lib/explorations/board-images.mjs';
import { makePng } from './helpers/board-fixtures.mjs';

const b64 = (bytes) => Math.ceil(bytes / 3) * 4;
const totalBase64 = (images) => images.reduce((n, i) => n + b64(i.buf.length), 0);

describe('pngSize', () => {
  it('reads the width and height from the header', () => {
    expect(pngSize(makePng(37, 12))).toEqual({ width: 37, height: 12 });
  });

  it.each([
    [
      'text',
      Buffer.from('not a png at all, just some text that is long enough to pass a length check'),
    ],
    ['an empty buffer', Buffer.alloc(0)],
    ['a truncated PNG', makePng(10, 10).subarray(0, 20)],
  ])('rejects %s as not a readable PNG', (_name, buf) => {
    expect(() => pngSize(buf)).toThrow('not a readable PNG');
  });
});

describe('downscalePng', () => {
  it('keeps the aspect ratio and averages the pixels it merges', () => {
    // a 4 x 2 image: left half black, right half white
    const src = new PNG({ width: 4, height: 2 });
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const i = (y * 4 + x) * 4;
        const v = x < 2 ? 0 : 255;
        src.data[i] = src.data[i + 1] = src.data[i + 2] = v;
        src.data[i + 3] = 255;
      }
    }
    const out = PNG.sync.read(downscalePng(PNG.sync.write(src), 0.5));
    expect([out.width, out.height]).toEqual([2, 1]);
    expect([out.data[0], out.data[4]]).toEqual([0, 255]); // each output pixel is a clean block
    const flat = PNG.sync.read(downscalePng(PNG.sync.write(src), 0.25));
    expect([flat.width, flat.height]).toEqual([1, 1]);
    expect(flat.data[0]).toBeGreaterThan(110); // the average of black and white, not either one
    expect(flat.data[0]).toBeLessThan(145);
  });

  it('never returns an image smaller than one pixel', () => {
    const out = PNG.sync.read(downscalePng(makePng(2, 2), 0.1));
    expect([out.width, out.height]).toEqual([1, 1]);
  });

  it('does not darken a transparent pixel into its neighbours', () => {
    const src = new PNG({ width: 2, height: 1 });
    src.data.set([200, 100, 50, 255, 0, 0, 0, 0]); // one opaque pixel, one fully transparent
    const out = PNG.sync.read(downscalePng(PNG.sync.write(src), 0.5));
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([200, 100, 50]);
  });
});

describe('fitImages', () => {
  const wide = (seed = 1) => ({
    key: `wide${seed}`,
    file: `wide${seed}.png`,
    buf: makePng(900, 100, { noise: true, seed }),
  });
  const narrow = (seed = 1) => ({
    key: `narrow${seed}`,
    file: `narrow${seed}.png`,
    buf: makePng(390, 500, { noise: true, seed }),
  });

  it('changes nothing when the images already fit', () => {
    const imgs = [wide(), narrow()];
    const r = fitImages(imgs, totalBase64(imgs));
    expect(r.downscaled).toEqual([]);
    expect(r.images.get('wide1').buf).toBe(imgs[0].buf);
    expect(r.images.get('wide1')).toMatchObject({ scale: 1, width: 900, height: 100 });
  });

  it('never reaches the result by dropping an image', () => {
    const imgs = [wide(1), wide(2), narrow(1)];
    const r = fitImages(imgs, Math.round(totalBase64(imgs) * 0.4));
    expect([...r.images.keys()].sort()).toEqual(['narrow1', 'wide1', 'wide2']);
    expect(r.total).toBeLessThanOrEqual(Math.round(totalBase64(imgs) * 0.4));
  });

  it('shrinks wide captures before narrow ones, even when a narrow one is heavier', () => {
    const imgs = [wide(1), narrow(1)];
    expect(imgs[1].buf.length).toBeGreaterThan(imgs[0].buf.length); // the phone capture is the heavier file
    // room for one 0.75 step of the wide capture, and nothing more
    const r = fitImages(imgs, totalBase64(imgs) - 40_000);
    expect(r.downscaled.map((d) => d.file)).toEqual(['wide1.png']);
    expect(r.images.get('narrow1').scale).toBe(1);
  });

  it('steps down 0.75, 0.5, 0.35, taking each step from the original', () => {
    const imgs = [wide()];
    const sizes = SCALE_STEPS.map((s) => b64(downscalePng(imgs[0].buf, s).length));
    for (const [i, scale] of SCALE_STEPS.entries()) {
      const r = fitImages(imgs, sizes[i]);
      expect(r.images.get('wide1').scale).toBe(scale);
      expect(r.downscaled[0]).toMatchObject({
        file: 'wide1.png',
        scale,
        fromBytes: imgs[0].buf.length,
      });
      expect(r.images.get('wide1').width).toBe(Math.round(900 * scale));
    }
  });

  it('touches a narrow capture only after every wide one is at its smallest step', () => {
    const imgs = [wide(1), narrow(1)];
    const floorWide = b64(downscalePng(imgs[0].buf, SCALE_STEPS.at(-1)).length);
    const r = fitImages(imgs, floorWide + b64(imgs[1].buf.length) - 1000);
    expect(r.images.get('wide1').scale).toBe(SCALE_STEPS.at(-1));
    expect(r.images.get('narrow1').scale).toBeLessThan(1);
  });

  it('fails, naming the room it had and the room it needed, when the smallest step does not fit', () => {
    const imgs = [wide(), narrow()];
    expect(() => fitImages(imgs, 1000)).toThrow(/too large[\s\S]*1000/);
  });
});
