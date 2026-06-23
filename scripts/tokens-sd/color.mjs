/**
 * Color-space conversion for native token targets (C4).
 *
 * Native platforms (iOS / Android / React Native) cannot parse `oklch()`; they
 * need resolved sRGB literals. This module converts the OKLCH strings in
 * hirobius.tokens.json to sRGB hex + 0–1 float channels, and passes through
 * values already in hex.
 *
 * OKLCH → OKLab → linear sRGB uses Björn Ottosson's published matrices
 * (https://bottosson.github.io/posts/oklab/). Out-of-sRGB-gamut colors — the
 * vivid accent stops carry chroma ~0.29, beyond sRGB — are gamut-clamped by
 * channel after gamma encoding. Clamping shifts hue/chroma slightly; it is a
 * best-effort native approximation, not a colorimetric match. Flagged per
 * conversion via `inGamut`.
 *
 * Dependency-free (no culori) to keep the token pipeline hermetic.
 */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** sRGB gamma encode a single linear channel (0–1). */
function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Parse `oklch(L C H)` / `oklch(L C H / a)`. L may be a 0–1 number or a %. */
export function parseOklch(str) {
  const m = /^oklch\(\s*([^)]+)\)\s*$/i.exec(str.trim());
  if (!m) return null;
  const parts = m[1].split('/');
  const coords = parts[0].trim().split(/\s+/);
  if (coords.length < 3) return null;
  const L = coords[0].endsWith('%') ? parseFloat(coords[0]) / 100 : parseFloat(coords[0]);
  const C = parseFloat(coords[1]);
  const H = parseFloat(coords[2]);
  const alpha = parts[1] !== undefined
    ? (parts[1].trim().endsWith('%') ? parseFloat(parts[1]) / 100 : parseFloat(parts[1]))
    : 1;
  if ([L, C, H, alpha].some((n) => Number.isNaN(n))) return null;
  return { L, C, H, alpha };
}

/** OKLCH components → { r, g, b } linear-clamped 0–1 floats + inGamut flag. */
export function oklchToRgb({ L, C, H }) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab → LMS (cube of the linearized response)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  // LMS → linear sRGB
  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const inGamut =
    rLin >= -1e-4 && rLin <= 1.0001 &&
    gLin >= -1e-4 && gLin <= 1.0001 &&
    bLin >= -1e-4 && bLin <= 1.0001;

  return {
    r: clamp01(linearToSrgb(clamp01(rLin))),
    g: clamp01(linearToSrgb(clamp01(gLin))),
    b: clamp01(linearToSrgb(clamp01(bLin))),
    inGamut,
  };
}

const toByte = (c) => Math.round(c * 255);
const hex2 = (n) => n.toString(16).padStart(2, '0');

/** { r,g,b } 0–1 → '#RRGGBB' (uppercase). */
export function rgbToHex({ r, g, b }) {
  return ('#' + hex2(toByte(r)) + hex2(toByte(g)) + hex2(toByte(b))).toUpperCase();
}

/**
 * Normalize any token color string to native sRGB.
 * @returns {{ hex: string, rgb: {r,g,b}, inGamut: boolean } | null}
 *   null = not a convertible standalone color (e.g. bare HSL channel components
 *   used inside hsl(var(--…)), which has no meaning on its own).
 */
export function normalizeColor(value) {
  const v = String(value).trim();

  // Already hex (#RGB / #RRGGBB / #RRGGBBAA)
  const hexM = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(v);
  if (hexM) {
    let h = hexM[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return { hex: ('#' + h.slice(0, 6)).toUpperCase(), rgb: { r, g, b }, inGamut: true };
  }

  // oklch(...)
  if (/^oklch\(/i.test(v)) {
    const parsed = parseOklch(v);
    if (!parsed) return null;
    const rgb = oklchToRgb(parsed);
    return { hex: rgbToHex(rgb), rgb, inGamut: rgb.inGamut };
  }

  // rgb(r g b) / rgb(r,g,b)
  const rgbM = /^rgba?\(\s*([^)]+)\)$/i.exec(v);
  if (rgbM) {
    const nums = rgbM[1].split(/[\s,/]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (nums.length >= 3) {
      const rgb = { r: nums[0] / 255, g: nums[1] / 255, b: nums[2] / 255 };
      return { hex: rgbToHex(rgb), rgb, inGamut: true };
    }
  }

  // Bare HSL channel components ("220 13% 18%") or anything else: not standalone.
  return null;
}
