/** @internal — pure helpers for the explorations board (hirobius/hds#628). */
/**
 * Screenshots for a board: read a PNG's size, and fit a set of them into a byte
 * budget.
 *
 * The board is one file with every screenshot inlined as a base64 data URI, and
 * an Artifact page may not pass 16 MB. A full-page capture at 1280 wide can be a
 * megabyte or more, and a board holds twelve of them. Rather than guess, the
 * board renders at full size and, when the page is over budget, downscales the
 * heaviest screenshots one step at a time (0.75, 0.5, then 0.35 of the width,
 * each step taken from the original so blur never compounds) until it fits.
 * Wide captures (the 1280 ones) go first: a board column is about 400 px, so a
 * 1280 capture is already shown at a third of its size and loses little, while a
 * 390 phone capture is shown 1:1 and loses real legibility.
 * A box filter averages every source pixel under a destination pixel, which
 * keeps thin UI rules and small type readable far better than dropping pixels.
 * Below 0.35 a 1280 capture is no longer legible, so past that step the build
 * fails and says how far over it is.
 */
import { PNG } from 'pngjs';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width factors a screenshot may be reduced to, in the order they are tried. */
export const SCALE_STEPS = [0.75, 0.5, 0.35];

/** A capture wider than this is shrunk before any narrower one (a phone capture is shown 1:1). */
const WIDE_PX = 800;

/**
 * Width and height from a PNG's header, without decoding it.
 * @param {Buffer} buf
 * @returns {{ width: number, height: number }}
 * @throws {Error} "not a readable PNG" when the bytes are not a PNG
 */
export function pngSize(buf) {
  if (
    !Buffer.isBuffer(buf) ||
    buf.length < 33 ||
    !buf.subarray(0, 8).equals(SIGNATURE) ||
    buf.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    throw new Error('not a readable PNG');
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!width || !height) throw new Error('not a readable PNG');
  return { width, height };
}

/**
 * Average a PNG down to `factor` of its width, keeping the aspect ratio.
 * @param {Buffer} buf
 * @param {number} factor between 0 and 1
 * @returns {Buffer} a PNG
 */
export function downscalePng(buf, factor) {
  const src = PNG.sync.read(buf);
  const width = Math.max(1, Math.round(src.width * factor));
  const height = Math.max(1, Math.round(src.height * factor));
  const out = new PNG({ width, height });
  const xr = src.width / width;
  const yr = src.height / height;
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor(y * yr);
    const y1 = Math.min(src.height, Math.max(y0 + 1, Math.ceil((y + 1) * yr)));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor(x * xr);
      const x1 = Math.min(src.width, Math.max(x0 + 1, Math.ceil((x + 1) * xr)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const i = (sy * src.width + sx) * 4;
          const w = src.data[i + 3];
          // alpha-weighted, so a transparent pixel does not drag its neighbours toward black
          r += src.data[i] * w;
          g += src.data[i + 1] * w;
          b += src.data[i + 2] * w;
          a += w;
        }
      }
      const n = (x1 - x0) * (y1 - y0);
      const o = (y * width + x) * 4;
      out.data[o] = a ? Math.round(r / a) : 0;
      out.data[o + 1] = a ? Math.round(g / a) : 0;
      out.data[o + 2] = a ? Math.round(b / a) : 0;
      out.data[o + 3] = Math.round(a / n);
    }
  }
  return PNG.sync.write(out, { deflateLevel: 9 });
}

const base64Length = (bytes) => Math.ceil(bytes / 3) * 4;

/**
 * Choose a size for each screenshot so their base64 total fits `targetBytes`.
 * The heaviest wide screenshot is stepped down first, and a narrow one only once
 * every wide one is at its smallest step; nothing is touched when the total
 * already fits.
 *
 * @param {{ key: string, file: string, buf: Buffer }[]} images
 * @param {number} targetBytes budget for the base64 text of all images together
 * @returns {{
 *   images: Map<string, { buf: Buffer, scale: number, width: number, height: number }>,
 *   downscaled: { file: string, scale: number, fromBytes: number, toBytes: number }[],
 *   total: number
 * }}
 * @throws {Error} when the smallest step still does not fit
 */
export function fitImages(images, targetBytes) {
  const state = images.map((img) => {
    const { width, height } = pngSize(img.buf);
    return {
      ...img,
      level: -1,
      width,
      height,
      cur: img.buf,
      curScale: 1,
      origBytes: img.buf.length,
    };
  });
  const total = () => state.reduce((sum, s) => sum + base64Length(s.cur.length), 0);

  while (total() > targetBytes) {
    const candidates = state.filter((s) => s.level < SCALE_STEPS.length - 1);
    if (candidates.length === 0) {
      throw new Error(
        `the screenshots are too large for the page budget: they need ${total()} bytes at the ` +
          `smallest scale (${SCALE_STEPS[SCALE_STEPS.length - 1]}) and ${Math.max(0, targetBytes)} bytes are free. ` +
          'Capture shorter pages or fewer screens, or raise the budget (the page limit is 16 MB).',
      );
    }
    const wide = candidates.filter((s) => s.width > WIDE_PX);
    const pool = wide.length ? wide : candidates;
    const heaviest = pool.reduce((a, b) => (b.cur.length > a.cur.length ? b : a));
    heaviest.level += 1;
    heaviest.curScale = SCALE_STEPS[heaviest.level];
    heaviest.cur = downscalePng(heaviest.buf, heaviest.curScale);
  }

  const out = new Map();
  const downscaled = [];
  for (const s of state) {
    const size = s.level === -1 ? { width: s.width, height: s.height } : pngSize(s.cur);
    out.set(s.key, { buf: s.cur, scale: s.curScale, width: size.width, height: size.height });
    if (s.level !== -1) {
      downscaled.push({
        file: s.file,
        scale: s.curScale,
        fromBytes: s.origBytes,
        toBytes: s.cur.length,
      });
    }
  }
  return { images: out, downscaled, total: total() };
}
