/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Raised edge colours (hds#897, C2): the hard "raised" ledge under a Button or Kbd is the
 * item's OWN fill stepped DARKER in both themes, chroma ×0.7225 (two steps of ×0.85), same
 * hue, clamped into sRGB by reducing chroma.
 *
 * Light: two steps of OKLCH lightness −0.06 (L −0.12).
 * Floor (hds#1387): a Button's computed edge keeps EDGE_FLOOR_CONTRAST (2:1) against its fill,
 * stepping further darker, or lighter when the fill is too dark for that (the near-black
 * light primary).
 * Dark: L drops a third of the way toward the card (surface.raised), never less than 0.03,
 * so a light primary fill gets a deep edge and a dark tonal fill still gets a visible one.
 * The old "lighter rim" (step lighter below 1.5:1) made dark buttons glow; C2 dropped it.
 *
 * build-tokens.mjs emits the results as --hds-edge-* custom properties (tokens.generated.css,
 * accents.css, tenants.css); tests/raised-edge.test.ts recomputes them from the fill tokens.
 */

import { contrastRatio } from '../../validators/contrast.mjs'; // one WCAG implementation, shared (hds#1011)

const DL = 0.06 * 2; // light: two steps of L −0.06
const CK = 0.85 ** 2; // two steps of C ×0.85
const DARK_SHARE = 1 / 3; // dark: share of the fill→card lightness gap the edge drops
const DARK_MIN = 0.03; // dark: smallest drop, for fills at or below the card

/** Where each computed raised item takes its fill, and the CSS hook name suffix it ships under. */
export const EDGE_FILLS = {
  primary: 'semantic.color.surface.accent', // role.primary (bg-primary)
  kbd: 'semantic.color.surface.overlay', // role.muted (bg-muted)
};

/**
 * Computed edges that keep the EDGE_FLOOR_CONTRAST floor against their fill (hds#1387). The
 * token Button edges keep EDGE_MIN_CONTRAST by their approved values. Kbd keeps
 * the plain C2 step: its light fill cannot reach the floor either way.
 */
export const EDGE_FLOORED = ['primary'];

/**
 * Computed edges that also ship as tokens, so Figma (button/edge/primary) has a code source.
 * The token holds this script's output per mode; buildEdgeCSS throws if they drift, and the
 * base --hds-edge-<key> reads component.button.edge.<key> instead of a hard-coded hex.
 * Accents and tenants still get computed overrides (overlayEdgeVars), since they move the fill.
 */
export const EDGE_COMPUTED_TOKENS = {
  primary: 'semantic.color.edge.primary',
};

/**
 * Button edges that are tokens, not computed (Adrian approved): component.button.edge.<key>,
 * a fixed primitive per theme, kept at least EDGE_MIN_CONTRAST against the fill it sits under.
 * --hds-edge-<key> aliases the token's CSS variable, which switches with the theme itself.
 */
// Where each Button edge's Light/Dark modes live; component.button.edge.<key>
// aliases these so component colors never skip the semantic tier.
export const EDGE_TOKENS = {
  secondary: 'semantic.color.edge.neutral',
  danger: 'semantic.color.edge.danger',
  success: 'semantic.color.edge.success',
  warning: 'semantic.color.edge.warning',
  info: 'semantic.color.edge.info',
};

/** The fill each token edge sits under (for the contrast floor). */
export const EDGE_TOKEN_FILLS = {
  secondary: 'component.button.secondary.bg.rest',
  danger: 'semantic.color.feedback.bg.error',
  success: 'semantic.color.feedback.bg.success',
  warning: 'semantic.color.feedback.bg.warning',
  info: 'semantic.color.feedback.bg.info',
};

/** Smallest WCAG contrast a token edge keeps against its fill. */
export const EDGE_MIN_CONTRAST = 1.5;

/**
 * Floor for computed Button edges (EDGE_FLOORED, hds#1387): 2:1 against the fill, above the
 * token edges' 1.5:1, because a contrast ratio understates a step near black: at 1.5:1 the
 * lip under the near-black light primary still read flat beside secondary's (1.71:1).
 */
export const EDGE_FLOOR_CONTRAST = 2;

/** The card a Button or Kbd usually sits on: the dark step is measured toward it. */
export const EDGE_CARD = 'semantic.color.surface.raised';

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

/**
 * The edge for one fill. `card` (dark only) is the surface the step is measured toward.
 * `floor` applies the EDGE_FLOOR_CONTRAST floor (Button edges, EDGE_FLOORED).
 * @returns {string} lowercase #rrggbb
 */
export function edgeFor(fill, mode, card, { floor = false } = {}) {
  const f = toOklch(fill);
  const dl = mode === 'Dark' ? Math.max((f.l - toOklch(card).l) * DARK_SHARE, DARK_MIN) : DL;
  const darker = oklchToHex({ l: f.l - dl, c: f.c * CK, h: f.h });
  const fillHex = oklchToHex(f);
  if (!floor || contrastRatio(fillHex, darker) >= EDGE_FLOOR_CONTRAST) return darker;
  // Contrast floor (hds#1387): the C2 step left some edges too close to their fill (the
  // near-black light primary got #010207 under #0f1726, 1.16:1, so the lip vanished and the
  // button read flat). Step further DARKER to the nearest lightness that keeps
  // EDGE_FLOOR_CONTRAST (2:1; the token edges keep 1.5:1); only a fill too dark for that steps
  // LIGHTER instead (a light lip under a black key). Same hue and chroma rule either way.
  // at(l): the edge colour at lightness l. meets(l): it keeps the floor. search: bisect
  // between a lightness that meets the floor and one that does not, returning the passing
  // colour nearest the failing side (the smallest change from the C2 step or the fill).
  const at = (l) => oklchToHex({ l, c: f.c * CK, h: f.h });
  const meets = (l) => contrastRatio(fillHex, at(l)) >= EDGE_FLOOR_CONTRAST;
  const search = (passing, failing) => {
    for (let i = 0; i < 40; i += 1) {
      const mid = (passing + failing) / 2;
      if (meets(mid)) passing = mid;
      else failing = mid;
    }
    return at(passing);
  };
  if (meets(0)) return search(0, f.l - dl);
  if (meets(1)) return search(1, f.l);
  return darker;
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
    const card = mode === 'Dark' ? resolveHex(tree, EDGE_CARD, mode) : undefined;
    out[mode] = Object.fromEntries(
      Object.entries(EDGE_FILLS).map(([k, fill]) => [
        k,
        edgeFor(resolveColor(tree, fill, mode), mode, card, { floor: EDGE_FLOORED.includes(k) }),
      ]),
    );
  }
  return out;
}

/**
 * Every computed edge token whose Light/Dark value differs from what this script computes.
 * @returns {string[]} one message per drifted mode; empty when they agree
 */
export function edgeTokenDrift(tree) {
  const e = computeEdges(tree);
  return Object.entries(EDGE_COMPUTED_TOKENS).flatMap(([k, path]) =>
    ['Light', 'Dark'].flatMap((mode) => {
      const v = resolveHex(tree, path, mode);
      return v === e[mode][k]
        ? []
        : [`${path} (${mode}) is ${v}; raised-edge computes ${e[mode][k]}`];
    }),
  );
}

const decls = (edges, keys) => keys.map((k) => `--hds-edge-${k}:${edges[k]};`).join('');
const tokenVar = (path) => `var(--${path.replaceAll('.', '-')})`;

/** The base CSS: light edges on :root, only the changed ones under [data-theme="dark"]. */
export function buildEdgeCSS(raw) {
  const drift = edgeTokenDrift(raw);
  if (drift.length)
    throw new Error(
      `raised-edge: edge token drift; set the token to the computed value:\n  ${drift.join('\n  ')}`,
    );
  const e = computeEdges(raw);
  const keys = Object.keys(EDGE_FILLS).filter((k) => !(k in EDGE_COMPUTED_TOKENS));
  const dark = keys.filter((k) => e.Dark[k] !== e.Light[k]);
  const aliased = [...Object.keys(EDGE_COMPUTED_TOKENS), ...Object.keys(EDGE_TOKENS)];
  return (
    `/* Raised edges (hds#897): computed fills stepped darker (C2); Button edges alias component.button.edge.*. scripts/lib/raised-edge.mjs */\n` +
    `:root{${aliased
      .map((k) => `--hds-edge-${k}:${tokenVar(`component.button.edge.${k}`)};`)
      .join('')}${decls(e.Light, keys)}}\n[data-theme="dark"]{${decls(e.Dark, dark)}}\n`
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
