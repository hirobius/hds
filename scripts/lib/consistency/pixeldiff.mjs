/** @internal — pure helpers for scripts/eval-consistency.mjs (hds#343). */
/**
 * Pixel diff of two PNG buffers (two agents' renders of the same screen).
 *
 * Two figures: `diffPct` is differing pixels over all pixels, and
 * `inkedDiffPct` is differing pixels over pixels that carry ink (differ from
 * their own image's background, taken from the top-left pixel) in either
 * image. The second is informational: on a mostly-empty page the first figure
 * flatters the result.
 *
 * Images of different size are padded to the larger canvas with opaque white,
 * so a taller page counts its extra content as difference. Anti-aliasing is
 * counted (includeAA) so the figure is exact and reproducible.
 */
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

function decode(buf, label) {
  try {
    return PNG.sync.read(buf);
  } catch (err) {
    throw new Error(`${label} is not a readable PNG: ${err.message}`);
  }
}

function pad(img, width, height) {
  if (img.width === width && img.height === height) return img.data;
  const out = Buffer.alloc(width * height * 4, 255);
  for (let y = 0; y < img.height; y += 1) {
    img.data.copy(out, y * width * 4, y * img.width * 4, (y + 1) * img.width * 4);
  }
  return out;
}

function inkMask(img) {
  const { width, height, data } = img;
  const mask = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p += 1) {
    for (let k = 0; k < 4; k += 1) {
      if (data[p * 4 + k] !== data[k]) {
        mask[p] = 1;
        break;
      }
    }
  }
  return mask;
}

/**
 * @param {Buffer} bufA
 * @param {Buffer} bufB
 * @param {{threshold?: number}} [options] pixelmatch colour threshold (default 0.1)
 */
export function diffPng(bufA, bufB, { threshold = 0.1 } = {}) {
  const a = decode(bufA, 'first image');
  const b = decode(bufB, 'second image');
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const da = pad(a, width, height);
  const db = pad(b, width, height);
  const mask = new Uint8Array(width * height);
  const put = (img) => {
    const m = inkMask(img);
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        if (m[y * img.width + x]) mask[y * width + x] = 1;
      }
    }
  };
  put(a);
  put(b);

  const out = new Uint8Array(width * height * 4);
  const diffPixels = pixelmatch(da, db, out, width, height, {
    threshold,
    includeAA: true,
    diffColor: [255, 0, 0],
  });
  // pixelmatch paints each differing pixel pure red and every other pixel grey,
  // so the ink-restricted count is read back from that output.
  let inkedDiffPixels = 0;
  let inkedPixels = 0;
  for (let p = 0; p < width * height; p += 1) {
    if (!mask[p]) continue;
    inkedPixels += 1;
    if (out[p * 4] === 255 && out[p * 4 + 1] === 0 && out[p * 4 + 2] === 0) inkedDiffPixels += 1;
  }
  const totalPixels = width * height;
  return {
    width,
    height,
    totalPixels,
    diffPixels,
    diffPct: (diffPixels * 100) / totalPixels,
    inkedPixels,
    inkedDiffPixels,
    inkedDiffPct: inkedPixels === 0 ? 0 : (inkedDiffPixels * 100) / inkedPixels,
  };
}
