/** @internal — pure helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * How close a rebuild is to the image it rebuilds.
 *
 * Two kinds of number, because neither is enough alone:
 *
 *   score      0-100, from the rubric the rebuilding agent fills in after
 *              looking at both images: layout, spacing, type, color and
 *              components, each 0 (nothing like it) to 4 (indistinguishable
 *              at a glance). This is the headline: the original has other
 *              text, other data and often a phone's chrome, so no pixel
 *              measure can say whether the *design* was matched.
 *   structure  0-1, mean SSIM of the two images in grayscale, both scaled to
 *              the same small width and cropped to the shorter height. It
 *              sees where the mass of the layout sits, not the words.
 *   palette    0-1, overlap of the two colour histograms (8 levels a channel).
 *
 * The measured pair keeps the rubric honest: a high score over a low
 * structure match is flagged for a second look (`fidelityFlags`). The CLI
 * writes the measured pair; only the agent writes the rubric.
 */
import { RUBRIC, RUBRIC_MAX } from './spec.mjs';

/** Width both images are scaled to before they are compared. */
export const COMPARE_WIDTH = 128;

/** @returns {{ ok:boolean, problems:string[], score:number|null }} */
export function rubricScore(rubric) {
  if (!rubric || typeof rubric !== 'object' || Array.isArray(rubric)) {
    return { ok: false, problems: ['rubric must be an object'], score: null };
  }
  const problems = [];
  for (const k of RUBRIC) {
    const v = rubric[k];
    if (!Number.isInteger(v) || v < 0 || v > RUBRIC_MAX) {
      problems.push(`rubric.${k} must be a whole number from 0 to ${RUBRIC_MAX}`);
    }
  }
  for (const k of Object.keys(rubric)) {
    if (!RUBRIC.includes(k)) problems.push(`rubric has unexpected key ${k}`);
  }
  if (problems.length) return { ok: false, problems, score: null };
  const sum = RUBRIC.reduce((n, k) => n + rubric[k], 0);
  return { ok: true, problems, score: Math.round((sum * 100) / (RUBRIC.length * RUBRIC_MAX)) };
}

/** RGBA bytes -> luma (0-255) per pixel, alpha composited on white. */
function luma({ width, height, data }) {
  const out = new Float64Array(width * height);
  for (let p = 0; p < width * height; p += 1) {
    const a = data[p * 4 + 3] / 255;
    const r = data[p * 4] * a + 255 * (1 - a);
    const g = data[p * 4 + 1] * a + 255 * (1 - a);
    const b = data[p * 4 + 2] * a + 255 * (1 - a);
    out[p] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return out;
}

const C1 = (0.01 * 255) ** 2;
const C2 = (0.03 * 255) ** 2;

/**
 * Mean SSIM over non-overlapping 8x8 windows of two luma arrays of one size.
 * Identical images score 1; unrelated ones land near 0.
 */
export function ssim(a, b, width, height, win = 8) {
  let total = 0;
  let n = 0;
  for (let y0 = 0; y0 + win <= height; y0 += win) {
    for (let x0 = 0; x0 + win <= width; x0 += win) {
      let ma = 0;
      let mb = 0;
      for (let y = y0; y < y0 + win; y += 1) {
        for (let x = x0; x < x0 + win; x += 1) {
          ma += a[y * width + x];
          mb += b[y * width + x];
        }
      }
      const count = win * win;
      ma /= count;
      mb /= count;
      let va = 0;
      let vb = 0;
      let cov = 0;
      for (let y = y0; y < y0 + win; y += 1) {
        for (let x = x0; x < x0 + win; x += 1) {
          const da = a[y * width + x] - ma;
          const db = b[y * width + x] - mb;
          va += da * da;
          vb += db * db;
          cov += da * db;
        }
      }
      va /= count - 1;
      vb /= count - 1;
      cov /= count - 1;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      n += 1;
    }
  }
  return n === 0 ? 0 : total / n;
}

/** Normalised 512-bin colour histogram (8 levels a channel), alpha composited on white. */
function histogram({ width, height, data }) {
  const h = new Float64Array(512);
  const q = (v) => Math.min(7, Math.floor(v / 32));
  for (let p = 0; p < width * height; p += 1) {
    const a = data[p * 4 + 3] / 255;
    const r = data[p * 4] * a + 255 * (1 - a);
    const g = data[p * 4 + 1] * a + 255 * (1 - a);
    const b = data[p * 4 + 2] * a + 255 * (1 - a);
    h[q(r) * 64 + q(g) * 8 + q(b)] += 1;
  }
  const total = width * height || 1;
  for (let i = 0; i < 512; i += 1) h[i] /= total;
  return h;
}

/** Histogram intersection: 1 when the two images use the same colours in the same amounts. */
export function paletteSimilarity(a, b) {
  const ha = histogram(a);
  const hb = histogram(b);
  let s = 0;
  for (let i = 0; i < 512; i += 1) s += Math.min(ha[i], hb[i]);
  return s;
}

/** The top `height` rows of an RGBA image. */
function cropTop(img, height) {
  if (img.height === height) return img;
  return { width: img.width, height, data: img.data.subarray(0, img.width * height * 4) };
}

const round3 = (v) => Math.round(v * 1000) / 1000;

/**
 * Compare two RGBA images already scaled to the same width.
 * @param {{width:number,height:number,data:Uint8Array|Uint8ClampedArray|Buffer}} source
 * @param {{width:number,height:number,data:Uint8Array|Uint8ClampedArray|Buffer}} rebuild
 */
export function compareImages(source, rebuild) {
  if (source.width !== rebuild.width) {
    throw new Error(
      `scale both images to one width first (source ${source.width}, rebuild ${rebuild.width})`,
    );
  }
  const height = Math.min(source.height, rebuild.height);
  const a = cropTop(source, height);
  const b = cropTop(rebuild, height);
  return {
    structure: round3(Math.max(0, ssim(luma(a), luma(b), a.width, height))),
    palette: round3(paletteSimilarity(a, b)),
    comparedHeight: height,
  };
}

/** Things worth a second look before a score is trusted. */
export function fidelityFlags({ score, structure, palette }) {
  const flags = [];
  if (typeof score === 'number' && typeof structure === 'number') {
    if (score >= 75 && structure < 0.25) {
      flags.push(
        `score ${score} is high for a structure match of ${structure}; re-check the rubric`,
      );
    }
    if (score <= 30 && structure >= 0.7) {
      flags.push(
        `score ${score} is low for a structure match of ${structure}; re-check the rubric`,
      );
    }
  }
  if (typeof score === 'number' && typeof palette === 'number' && score >= 75 && palette < 0.2) {
    flags.push(`score ${score} is high for a palette match of ${palette}; re-check rubric.color`);
  }
  return flags;
}
