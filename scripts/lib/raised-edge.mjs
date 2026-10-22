/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Raised edge colours (hds#897): the hard "raised" ledge under a Button or Kbd is the item's
 * OWN fill, stepped two steps darker. One step = OKLCH lightness −0.06, chroma ×0.85, same
 * hue (so two = L −0.12, C ×0.7225), clamped into sRGB by reducing chroma.
 *
 * Dark ("lighter rim"): a darker edge vanishes on a near-black page, so when the darker step
 * is under 1.5:1 against any surface the item sits on, the fill steps LIGHTER instead
 * (L +0.12, C ×0.7225) and then climbs in 0.01 L until it clears 1.5:1 on every one.
 *
 * build-tokens.mjs emits the results as --hds-edge-* custom properties (tokens.generated.css,
 * accents.css, tenants.css); tests/raised-edge.test.ts recomputes them from the fill tokens.
 */

export const EDGE_FLOOR = 1.5;
const DL = 0.06 * 2; // two steps of L −0.06
const CK = 0.85 ** 2; // two steps of C ×0.85

/** Where each raised item takes its fill, and the CSS hook name suffix it ships under. */
export const EDGE_FILLS = {
  primary: 'semantic.color.surface.accent', // role.primary (bg-primary)
  secondary: 'component.button.secondary.bg.rest',
  danger: 'semantic.color.feedback.bg.error',
  success: 'semantic.color.feedback.bg.success',
  warning: 'semantic.color.feedback.bg.warning',
  info: 'semantic.color.feedback.bg.info',
  kbd: 'semantic.color.surface.overlay', // role.muted (bg-muted)
};

/** The surfaces a Button or Kbd is placed on (the soft-surfaces contrast scope). */
export const EDGE_GROUNDS = ['page', 'raised', 'overlay', 'muted'].map(
  (s) => `semantic.color.surface.${s}`,
);

// ── sRGB ↔ OKLCH ─────────────────────────────────────────────────────────────
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

function oklchToLinear({ l: L, c, h }) {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6);

/** A `#rrggbb` or `oklch(L C H)` token value as OKLCH. */
export function toOklch(value) {
  if (value.startsWith('#')) return hexToOklch(value);
  const m = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/i);
  if (!m) throw new Error(`raised-edge: cannot read colour ${value}`);
  return { l: Number(m[1]) / (m[2] ? 100 : 1), c: Number(m[3]), h: Number(m[4]) };
}

/** OKLCH → hex, reducing chroma (same L and hue) until the colour fits sRGB. */
export function oklchToHex(lch) {
  const L = Math.min(1, Math.max(0, lch.l));
  let rgb = oklchToLinear({ ...lch, l: L });
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = lch.c;
    for (let i = 0; i < 30; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ l: L, c: mid, h: lch.h }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinear({ l: L, c: lo, h: lch.h });
  }
  return `#${rgb
    .map((v) =>
      Math.round(gam(Math.min(1, Math.max(0, v))) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

// ── WCAG contrast ────────────────────────────────────────────────────────────
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * The edge for one fill. `grounds` (dark only) are the surfaces it must clear 1.5:1 on.
 * @returns {string} lowercase #rrggbb
 */
export function edgeFor(fill, mode, grounds = []) {
  const f = toOklch(fill);
  const darker = oklchToHex({ l: f.l - DL, c: f.c * CK, h: f.h });
  const clears = (hex) => grounds.every((g) => contrast(hex, g) >= EDGE_FLOOR);
  if (mode !== 'Dark' || clears(darker)) return darker;
  for (let l = f.l + DL; l <= 1.0001; l += 0.01) {
    const lighter = oklchToHex({ l, c: f.c * CK, h: f.h });
    if (clears(lighter)) return lighter;
  }
  throw new Error(`raised-edge: no lighter rim of ${fill} clears ${EDGE_FLOOR}:1`);
}

// ── Token resolution ─────────────────────────────────────────────────────────
/** `base` with each `layer` leaf laid over it (an accent or tenant overlay). */
export function layered(base, layer) {
  if (!layer || typeof layer !== 'object' || '$value' in layer) return layer;
  const out = { ...base };
  for (const [k, v] of Object.entries(layer)) out[k] = k in base ? layered(base[k], v) : v;
  return out;
}

const at = (tree, path) => path.split('.').reduce((n, k) => n?.[k], tree);

/** A colour token's value (#rrggbb or oklch()) in a Figma mode, following aliases mode by mode. */
export function resolveColor(tree, path, mode) {
  let value = `{${path}}`;
  for (let i = 0; i < 20 && typeof value === 'string' && value.startsWith('{'); i += 1) {
    const node = at(tree, value.slice(1, -1));
    value = node?.$extensions?.['com.figma.variables']?.modes?.[mode] ?? node?.$value;
  }
  if (typeof value !== 'string' || !/^(#[0-9a-f]{6}|oklch\(.*\))$/i.test(value))
    throw new Error(`raised-edge: ${path} (${mode}) does not resolve to a colour`);
  return value.toLowerCase();
}

/** The same, as #rrggbb (oklch values converted, for contrast maths). */
export const resolveHex = (tree, path, mode) => {
  const v = resolveColor(tree, path, mode);
  return v.startsWith('#') ? v : oklchToHex(toOklch(v));
};

/** Every edge for a token tree, per mode: { Light: { primary: '#…', … }, Dark: { … } }. */
export function computeEdges(tree) {
  const out = {};
  for (const mode of ['Light', 'Dark']) {
    const grounds = mode === 'Dark' ? EDGE_GROUNDS.map((g) => resolveHex(tree, g, mode)) : [];
    out[mode] = Object.fromEntries(
      Object.entries(EDGE_FILLS).map(([k, fill]) => [
        k,
        edgeFor(resolveColor(tree, fill, mode), mode, grounds),
      ]),
    );
  }
  return out;
}

const decls = (edges, keys) => keys.map((k) => `--hds-edge-${k}:${edges[k]};`).join('');

/** The base CSS: light edges on :root, only the changed ones under [data-theme="dark"]. */
export function buildEdgeCSS(raw) {
  const e = computeEdges(raw);
  const keys = Object.keys(EDGE_FILLS);
  const dark = keys.filter((k) => e.Dark[k] !== e.Light[k]);
  return (
    `/* Raised edges (hds#897): each fill stepped 2 darker; dark lightens below 1.5:1. scripts/lib/raised-edge.mjs */\n` +
    `:root{${decls(e.Light, keys)}}\n[data-theme="dark"]{${decls(e.Dark, dark)}}\n`
  );
}

/**
 * Overlay CSS (accents, tenants): only the edges the overlay changes, per mode, as
 * declaration lists for its light and dark blocks. Empty when it leaves every edge fill alone.
 * In dark, the overlay's light block (later in the cascade) beats the base dark block, so a
 * dark edge is restated whenever it differs from whatever would otherwise be in force.
 */
export function overlayEdgeVars(raw, overlay) {
  // A partial token tree (build-tokens unit fixtures) has no edge fills; a real one that
  // fails to resolve still throws.
  if (Object.values(EDGE_FILLS).some((p) => !at(raw, p))) return { light: [], dark: [] };
  const base = computeEdges(raw);
  const mine = computeEdges(layered(raw, overlay));
  const keys = Object.keys(EDGE_FILLS);
  const light = keys.filter((k) => mine.Light[k] !== base.Light[k]);
  const dark = keys.filter(
    (k) => mine.Dark[k] !== (light.includes(k) ? mine.Light[k] : base.Dark[k]),
  );
  const line = (e) => (k) => `  --hds-edge-${k}: ${e[k]}; /* css-ok: raised edge (hds#897) */`;
  return { light: light.map(line(mine.Light)), dark: dark.map(line(mine.Dark)) };
}
