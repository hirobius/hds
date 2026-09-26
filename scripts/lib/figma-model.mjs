/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — tokens → Figma model (pure).
 *
 * buildFigmaModel(raw) turns hirobius.tokens.json into the one description of
 * what the Figma library should contain: variable collections × modes ×
 * variables keyed by token path, text styles, effect styles, and the declared
 * list of tokens that deliberately have no Figma representation. Given demo
 * tenant overlays, it adds the Brand and Density collections (see "Brand and
 * density axes" below).
 * scripts/lib/figma-model-invariants.mjs checks it against what Figma accepts
 * and what HDS promises about it. Nothing here does I/O: `pnpm figma:model`
 * (scripts/build-figma-model.mjs) writes figma/model.json, and the legacy
 * import/REST payloads in scripts/build-figma-variables.mjs are projections.
 */

import { readModes, modeValue } from './token-modes.mjs';

// ── Token graph ──────────────────────────────────────────────────────────────
// build-tokens.mjs exports the same walker, but importing it reads
// public/hds-manifest.json at module load, which would make this module impure.
const DTCG_KEYS = new Set(['$type', '$value', '$description', '$extensions', '$schema']);

function* walkTokens(node, path = [], inheritedType = null) {
  if (!node || typeof node !== 'object') return;
  const type = node.$type || inheritedType;
  if ('$value' in node) {
    yield {
      path,
      type,
      value: node.$value,
      extensions: node.$extensions,
      description: node.$description,
    };
    return;
  }
  for (const key of Object.keys(node)) {
    if (DTCG_KEYS.has(key)) continue;
    yield* walkTokens(node[key], [...path, key], type);
  }
}

const isAlias = (v) => typeof v === 'string' && v.startsWith('{') && v.endsWith('}');
const aliasPath = (v) => v.slice(1, -1);
const round2 = (n) => Math.round(n * 100) / 100 || 0; // `|| 0` folds -0 into 0

const isThemed = (token) => {
  const modes = readModes(token.extensions);
  return Boolean(modes && ('Light' in modes || 'Dark' in modes));
};

// ── Colors ───────────────────────────────────────────────────────────────────
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/**
 * Six decimals is finer than an 8-bit channel step (1/255 ≈ 0.0039) and keeps
 * the model byte-stable across Node versions, whose trig/pow can differ in the
 * last bits of the OKLCH conversion.
 */
const roundChannels = ({ r, g, b, a }) =>
  Object.fromEntries(
    Object.entries({ r, g, b, a }).map(([k, v]) => [k, Math.round(v * 1e6) / 1e6]),
  );

function hexToRgb(hex) {
  const clean = hex.replace(/^#/, '');
  const full = clean.length <= 4 ? [...clean].map((ch) => ch + ch).join('') : clean;
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(full)) throw new Error(`Unsupported hex color: ${hex}`);
  const channel = (i) => parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: channel(0), g: channel(2), b: channel(4), a: full.length === 8 ? channel(6) : 1 };
}

function oklchToRgb(input) {
  const match = String(input)
    .trim()
    .match(/^oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\s*\)$/i);
  if (!match) throw new Error(`Unsupported OKLCH color: ${input}`);
  const lightness = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
  const chroma = parseFloat(match[2]);
  const hue = (parseFloat(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const encode = (linear) => {
    const c = clamp01(linear);
    return clamp01(c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  };
  return {
    r: encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: clamp01(parseFloat(match[4] ?? '1')),
  };
}

/** Tailwind-style HSL channels, e.g. "220 13% 18%" (the shadow tint). */
const HSL_CHANNELS = /^(-?[0-9.]+)\s+(-?[0-9.]+)%\s+(-?[0-9.]+)%(?:\s*\/\s*([0-9.]+))?$/;

function hslChannelsToRgb(input) {
  const match = String(input).trim().match(HSL_CHANNELS);
  if (!match) throw new Error(`Unsupported HSL channel string: ${input}`);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((parseFloat(match[1]) % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.min(5, Math.floor(hp))];
  const m = l - c / 2;
  const a = clamp01(parseFloat(match[4] ?? '1'));
  return { r: clamp01(r1 + m), g: clamp01(g1 + m), b: clamp01(b1 + m), a };
}

/** hex, oklch(), HSL channels, or a DTCG 2025.10 color object → Figma RGBA (0–1). */
function colorToFigma(val) {
  if (typeof val === 'string') {
    if (val.startsWith('#')) return roundChannels(hexToRgb(val));
    if (val.startsWith('oklch(')) return roundChannels(oklchToRgb(val));
    if (HSL_CHANNELS.test(val.trim())) return roundChannels(hslChannelsToRgb(val));
  } else if (Array.isArray(val?.components)) {
    const [r, g, b] = val.components.map(clamp01);
    return roundChannels({ r, g, b, a: clamp01(val.alpha ?? 1) });
  }
  throw new Error(`Unsupported color token value: ${JSON.stringify(val)}`);
}

// ── Collections ──────────────────────────────────────────────────────────────
/**
 * One collection per tier, and one theme axis. Figma picks a mode per
 * collection, and an unset collection falls back to its first mode (Light), so
 * a second Light/Dark collection would show Light values in a Dark frame. Every
 * themed token therefore lives in the Semantic collection, whatever its tier
 * (today primitive.shadow.color, still hidden, and
 * component.button.primary.textDisabled). Unthemed variables in other tiers
 * alias Semantic, so they follow the frame's Semantic mode without modes of
 * their own. validateFigmaModel enforces the single axis.
 */
const TIERS = [
  { key: 'primitive', name: 'Hirobius/Primitives' },
  { key: 'semantic', name: 'Hirobius/Semantic' },
  { key: 'component', name: 'Hirobius/Component' },
  { key: 'role', name: 'Hirobius/Role' },
];
const THEME_TIER = 'semantic';
export const THEME_MODES = Object.freeze(['Light', 'Dark']);
const SINGLE_MODE = 'Default';
const THEME_HOME_NOTE = 'Themed, so it lives in Hirobius/Semantic, the one Light/Dark collection.';

const FIGMA_TYPE = {
  color: 'COLOR',
  dimension: 'FLOAT',
  fontWeight: 'FLOAT',
  number: 'FLOAT',
  fontFamily: 'STRING',
};

// ── Deliberately not in Figma ────────────────────────────────────────────────
const MOTION_TYPES = new Set(['duration', 'cubicBezier', 'spring', 'motion', 'transition']);

/**
 * Tokens with no Figma representation, each with the reason. Entries are
 * checked in order and the first match wins; a sub-property entry names a
 * typography composite key that text styles cannot carry. The model lists the
 * tokens each entry matched, and a test fails on an entry that matches nothing.
 */
export const NOT_IN_FIGMA = [
  {
    id: 'motion',
    reason:
      'Figma cannot bind variables to prototype transition timing or easing, so durations, cubic-bezier curves, springs and motion composites stay in code (Motion) and are documented in DESIGN-HANDOFF.md.',
    matches: (token) => MOTION_TYPES.has(token.type),
  },
  {
    id: 'z-index',
    reason:
      'Stacking order in Figma is the order of layers in the layers panel, not a property a variable can drive.',
    matches: (token) => token.path[1] === 'zIndex',
  },
  {
    id: 'breakpoints',
    reason:
      'Figma has no media queries: responsive layouts are drawn as separate frames at fixed widths, so breakpoint values have nothing to bind to.',
    matches: (token) => token.path[1] === 'breakpoint',
  },
  {
    id: 'motion-distance',
    reason:
      "Figma prototyping derives travel distance from a layer's own frame position, not a bindable scalar variable — a translateY offset has nothing to bind to, same as duration/easing (hds#242).",
    matches: (token) => token.path[1] === 'motion' && token.path[2] === 'distance',
  },
  {
    id: 'relative-typography',
    reason:
      "Font-size-relative multipliers (em letter-spacing, unitless line-height). Figma applies number variables to letter spacing and line height as px only, so each typography/<style> variable carries the px value resolved at that style's font size instead.",
    matches: (token, graph) => isRelativeTypography(graph, token),
  },
  {
    id: 'text-measure',
    reason:
      'Text styles have no max-width (measure) property; prose frames use the layout/prose/maxWidth variable instead.',
    subProperty: 'maxWidth',
  },
];

function isRelativeTypography(graph, token) {
  if (token.type !== 'dimension' && token.type !== 'number') return false;
  const leaf = graph.resolveToken(token);
  if (leaf.value?.unit === 'em') return true;
  const onLineHeight = [token, leaf].some((t) => t.path.includes('lineHeight'));
  return typeof leaf.value === 'number' && (token.type === 'dimension' || onLineHeight);
}

// ── Values and units ─────────────────────────────────────────────────────────
/**
 * 1ch is the advance width of "0" in the rendering font. Figma has no ch unit,
 * so ch widths are converted at the body text style, where the prose measure
 * applies. The advance was measured, not estimated; buildFigmaModel refuses to
 * convert if the body style stops rendering the measured family and weight.
 */
export const CH_BASIS = Object.freeze({
  style: 'semantic.typography.body',
  family: 'Satoshi',
  weight: 500,
  zeroAdvanceEm: 0.693,
  measuredFrom:
    'public/fonts/satoshi/satoshi-500.woff2: hmtx advance of "0" (693) / head.unitsPerEm (1000), measured 2026-09-16',
});

function chToPx(graph, count) {
  const body = graph.byPath.get(CH_BASIS.style);
  if (body?.type !== 'typography') {
    throw new Error(
      `Cannot convert ch: ${CH_BASIS.style} is missing, and CH_BASIS is measured against it.`,
    );
  }
  const at = (key) => `${CH_BASIS.style}.${key}`;
  const family = toFigmaValue(
    graph,
    graph.resolveRef(body.value.fontFamily, at('fontFamily')),
    'fontFamily',
  );
  const weight = graph.resolveRef(body.value.fontWeight, at('fontWeight'));
  if (family !== CH_BASIS.family || weight !== CH_BASIS.weight) {
    throw new Error(
      `Cannot convert ch: CH_BASIS was measured for ${CH_BASIS.family} ${CH_BASIS.weight} but ${CH_BASIS.style} now renders ${family} ${weight} — re-measure zeroAdvanceEm from that font file.`,
    );
  }
  const fontSize = toFigmaValue(
    graph,
    graph.resolveRef(body.value.fontSize, at('fontSize')),
    'dimension',
  );
  return round2(count * CH_BASIS.zeroAdvanceEm * fontSize);
}

/** A raw (non-alias) token value as the Figma value for its type. */
function toFigmaValue(graph, value, type) {
  switch (type) {
    case 'color':
      return colorToFigma(value);
    case 'dimension':
      if (value?.unit === 'px') return value.value;
      if (value?.unit === 'ch') return chToPx(graph, value.value);
      throw new Error(`No px conversion for dimension ${JSON.stringify(value)}`);
    case 'fontWeight':
    case 'number':
      if (typeof value === 'number') return value;
      throw new Error(`Expected a number, got ${JSON.stringify(value)}`);
    case 'fontFamily':
      return Array.isArray(value) ? value[0] : String(value);
    default:
      throw new Error(`No Figma value mapping for type ${type}`);
  }
}

const modeEntry = (graph, ref, type) =>
  isAlias(ref) ? { alias: aliasPath(ref) } : { value: toFigmaValue(graph, ref, type) };

/** 'px' for a dimension that resolves to px (or converts from ch), else null. */
function unitOf(graph, token) {
  if (token.type !== 'dimension') return null;
  return ['px', 'ch'].includes(graph.resolveToken(token).value?.unit) ? 'px' : null;
}

function createGraph(raw) {
  const tokens = [...walkTokens(raw)].filter((t) => t.type);
  const byPath = new Map(tokens.map((t) => [t.path.join('.'), t]));

  /** Follows an alias chain to the leaf token that holds a raw value. */
  const resolveToken = (token) => {
    const seen = new Set();
    let current = token;
    while (isAlias(current.value)) {
      const target = aliasPath(current.value);
      if (seen.has(target)) throw new Error(`Circular alias at ${token.path.join('.')}`);
      seen.add(target);
      current = byPath.get(target);
      if (!current) throw new Error(`${token.path.join('.')} aliases unknown token ${target}`);
    }
    return current;
  };

  return {
    tokens,
    byPath,
    cssVarToToken: new Map(tokens.map((t) => [`--${t.path.join('-')}`, t])),
    resolveToken,
    /** A composite sub-value at `where`: follows an alias to its raw value. */
    resolveRef: (ref, where) =>
      isAlias(ref) ? resolveToken({ path: [where], value: ref }).value : ref,
  };
}

// ── Scopes ───────────────────────────────────────────────────────────────────
/**
 * Scopes decide which Figma pickers offer a variable. Primitives get none (they
 * are reached through aliases); everything else is scoped by the words in its
 * path, nearest segment first, so `button.secondary.bg.rest` is a fill because
 * of `bg`. A FLOAT that matches no rule falls back to ALL_SCOPES, which
 * validateFigmaModel only accepts for ALL_SCOPES_ALLOWLIST.
 */
const COLOR_SCOPE_RULES = [
  {
    any: ['text', 'content', 'foreground', 'fg'],
    scopes: ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'],
  },
  { any: ['bg', 'background', 'surface', 'backdrop'], scopes: ['FRAME_FILL', 'SHAPE_FILL'] },
  { any: ['border', 'ring', 'stroke', 'input'], scopes: ['STROKE_COLOR'] },
];
const COLOR_FALLBACK_SCOPES = ['ALL_FILLS', 'STROKE_COLOR'];

const FLOAT_SCOPE_RULES = [
  { all: ['font', 'size'], scopes: ['FONT_SIZE'] },
  { all: ['letter', 'spacing'], scopes: ['LETTER_SPACING'] },
  { all: ['line', 'height'], scopes: ['LINE_HEIGHT'] },
  { all: ['border', 'width'], scopes: ['STROKE_FLOAT'] },
  { any: ['radius'], scopes: ['CORNER_RADIUS'] },
  { any: ['blur'], scopes: ['EFFECT_FLOAT'] },
  { any: ['width', 'height', 'size'], scopes: ['WIDTH_HEIGHT'] },
  { any: ['padding', 'gap', 'spacing', 'space', 'indent', 'inset', 'stack'], scopes: ['GAP'] },
];

/** Variables allowed to keep ALL_SCOPES, by token-path prefix, with the reason. */
export const ALL_SCOPES_ALLOWLIST = [
  {
    prefix: 'semantic.layout.grid.columns.',
    reason: 'Layout-grid column counts have no dedicated VariableScope.',
  },
];

const segmentWords = (segment) =>
  segment
    .split(/[-_]|(?=[A-Z])/)
    .map((w) => w.toLowerCase())
    .filter(Boolean);

const ruleMatches = (rule, words) =>
  rule.all ? rule.all.every((w) => words.includes(w)) : rule.any.some((w) => words.includes(w));

function scopesFor(segments, tokenType, resolvedType) {
  if (segments[0] === 'primitive') return [];
  if (tokenType === 'fontWeight') return ['FONT_WEIGHT'];
  if (tokenType === 'fontFamily') return ['FONT_FAMILY'];
  const rules = resolvedType === 'COLOR' ? COLOR_SCOPE_RULES : FLOAT_SCOPE_RULES;
  for (let i = segments.length - 1; i >= 1; i--) {
    const words = segmentWords(segments[i]);
    const rule = rules.find((r) => ruleMatches(r, words));
    if (rule) return [...rule.scopes];
  }
  return resolvedType === 'COLOR' ? [...COLOR_FALLBACK_SCOPES] : ['ALL_SCOPES'];
}

// ── Typography ───────────────────────────────────────────────────────────────
/** Composite key → [variable suffix, scalar token type]. Suffixes match the CSS vars. */
const TYPOGRAPHY_VARIABLES = {
  fontFamily: ['font-family', 'fontFamily'],
  fontSize: ['font-size', 'dimension'],
  fontWeight: ['font-weight', 'fontWeight'],
  letterSpacing: ['letter-spacing', 'dimension'],
  lineHeight: ['line-height', 'dimension'],
};
const TEXT_CASE = { none: 'ORIGINAL', uppercase: 'UPPER', lowercase: 'LOWER', capitalize: 'TITLE' };
const FONT_STYLE_BY_WEIGHT = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/** px value + variable entry for a length CSS may express relative to font size. */
function typographicLength(graph, ref, where, fontSize) {
  const leaf = graph.resolveRef(ref, where);
  if (typeof leaf === 'number') {
    const px = round2(leaf * fontSize);
    return { px, entry: { value: px }, note: `Converted from ${leaf} × ${fontSize}px.` };
  }
  if (leaf?.unit === 'em') {
    const px = round2(leaf.value * fontSize);
    return { px, entry: { value: px }, note: `Converted from ${leaf.value}em at ${fontSize}px.` };
  }
  const pxString = typeof leaf === 'string' && leaf.match(/^(-?[0-9.]+)px$/);
  if (pxString) {
    const px = parseFloat(pxString[1]);
    return { px, entry: { value: px } };
  }
  if (leaf?.unit === 'px') {
    return {
      px: leaf.value,
      entry: isAlias(ref) ? { alias: aliasPath(ref) } : { value: leaf.value },
    };
  }
  throw new Error(`No px conversion for ${where}: ${JSON.stringify(leaf)}`);
}

/**
 * A typography composite → five scalar variables (resolved at the style's own
 * font size) plus a text style bound to them.
 *
 * @returns {{ variables: object[], textStyle: object, excluded: Array<[string, string]> }}
 *   `excluded` pairs a NOT_IN_FIGMA sub-property id with the sub-property path.
 */
function expandTypography(graph, token) {
  const path = token.path.join('.');
  const v = token.value;
  const at = (key) => `${path}.${key}`;
  const excluded = [];
  for (const key of Object.keys(v)) {
    const entry = NOT_IN_FIGMA.find((e) => e.subProperty === key);
    if (entry) excluded.push([entry.id, at(key)]);
    else if (!(key in TYPOGRAPHY_VARIABLES) && key !== 'textTransform') {
      throw new Error(
        `No Figma mapping for ${at(key)} — map the typography key in scripts/lib/figma-model.mjs or declare it in NOT_IN_FIGMA with a reason.`,
      );
    }
  }

  const raw = (key, type) => toFigmaValue(graph, graph.resolveRef(v[key], at(key)), type);
  const fontSize = raw('fontSize', 'dimension');
  const family = raw('fontFamily', 'fontFamily');
  const weight = raw('fontWeight', 'fontWeight');
  const direct = (key, value) => ({
    entry: isAlias(v[key]) ? { alias: aliasPath(v[key]) } : { value },
  });
  const resolved = {
    fontFamily: direct('fontFamily', family),
    fontSize: direct('fontSize', fontSize),
    fontWeight: direct('fontWeight', weight),
    letterSpacing: typographicLength(graph, v.letterSpacing, at('letterSpacing'), fontSize),
    lineHeight: typographicLength(graph, v.lineHeight, at('lineHeight'), fontSize),
  };

  const variables = Object.entries(TYPOGRAPHY_VARIABLES).map(([key, [suffix, tokenType]]) => ({
    segments: [...token.path, suffix],
    tokenType,
    themed: false,
    unit: tokenType === 'dimension' ? 'px' : null,
    description: [token.description, resolved[key].note].filter(Boolean).join(' '),
    entryFor: () => resolved[key].entry,
  }));

  const fontStyle = FONT_STYLE_BY_WEIGHT[weight];
  const textCase = TEXT_CASE[v.textTransform ?? 'none'];
  if (!fontStyle)
    throw new Error(`No Figma font style for weight ${weight} at ${at('fontWeight')}`);
  if (!textCase)
    throw new Error(`No Figma text case for textTransform "${v.textTransform}" at ${path}`);

  const textStyle = {
    name: token.path.slice(1).join('/'),
    path,
    description: token.description ?? '',
    fontFamily: family,
    fontStyle,
    fontWeight: weight,
    fontSize,
    lineHeight: { unit: 'PIXELS', value: resolved.lineHeight.px },
    letterSpacing: { unit: 'PIXELS', value: resolved.letterSpacing.px },
    textCase,
    boundVariables: Object.fromEntries(
      Object.entries(TYPOGRAPHY_VARIABLES).map(([key, [suffix]]) => [key, `${path}.${suffix}`]),
    ),
  };
  return { variables, textStyle, excluded };
}

// ── Effects ──────────────────────────────────────────────────────────────────
const LENGTH = String.raw`-?[0-9.]+(?:px)?`;
const SHADOW_LAYER = new RegExp(
  `^(inset\\s+)?(${LENGTH})\\s+(${LENGTH})(?:\\s+(${LENGTH}))?(?:\\s+(${LENGTH}))?\\s+(.+)$`,
);
const HSL_VAR = /^hsl\(\s*var\((--[\w-]+)\)\s*(?:\/\s*([0-9.]+))?\s*\)$/;

/** Splits a CSS shadow list on the commas between layers, not inside hsl(…). */
function splitLayers(css) {
  const layers = [];
  let depth = 0;
  let current = '';
  for (const ch of css) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      layers.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) layers.push(current.trim());
  return layers;
}

const shadowEffect = ({ inset, color, x, y, radius, spread }) => ({
  type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
  color,
  offset: { x, y },
  radius,
  spread,
  visible: true,
  blendMode: 'NORMAL',
  ...(inset ? {} : { showShadowBehindNode: false }),
});

/**
 * Figma effects for a shadow token, plus the color token that tints them.
 * Effect styles have no modes, so a themed tint uses its Light value.
 */
function shadowEffects(graph, token) {
  const path = token.path.join('.');
  const fail = (why) => {
    throw new Error(`No Figma effect mapping for ${path}: ${why}`);
  };
  let tint = null;
  const colorOf = (css) => {
    const hslVar = css.match(HSL_VAR);
    if (!hslVar) {
      try {
        return colorToFigma(css);
      } catch {
        return fail(`unsupported shadow color "${css}"`);
      }
    }
    const colorToken = graph.cssVarToToken.get(hslVar[1]);
    if (!colorToken) fail(`${hslVar[1]} is not a token`);
    tint ??= {
      token: colorToken.path.join('.'),
      mode: isThemed(colorToken) ? 'Light' : SINGLE_MODE,
    };
    const base = colorToFigma(graph.resolveRef(modeValue(colorToken, 'Light'), path));
    return roundChannels({ ...base, a: base.a * parseFloat(hslVar[2] ?? '1') });
  };

  // HDS shadows are pre-composed CSS strings (see build-tokens V1); a
  // structured DTCG shadow object is refused here rather than guessed at.
  if (typeof token.value !== 'string') fail('expected a CSS shadow string');
  if (token.value.trim() === 'none') return { effects: [], tint };
  const effects = splitLayers(token.value).map((layer) => {
    const m = layer.match(SHADOW_LAYER);
    if (!m) fail(`cannot parse shadow layer "${layer}"`);
    return shadowEffect({
      inset: Boolean(m[1]),
      x: parseFloat(m[2]),
      y: parseFloat(m[3]),
      radius: parseFloat(m[4] ?? '0'),
      spread: parseFloat(m[5] ?? '0'),
      color: colorOf(m[6].trim()),
    });
  });
  return { effects, tint };
}

/** A shadow or elevation token → an effect style (elevations also name their fill/stroke pair). */
function effectStyleFor(graph, token) {
  const path = token.path.join('.');
  const base = { name: token.path.slice(1).join('/'), path, description: token.description ?? '' };
  if (token.type === 'shadow') return { ...base, ...shadowEffects(graph, token) };

  const pairOf = (slot) => {
    const ref = token.value?.[slot];
    if (ref == null) return null;
    if (!isAlias(ref)) throw new Error(`No Figma pairing for ${path}.${slot}: expected an alias`);
    return aliasPath(ref);
  };
  const shadowRef = token.value?.shadow;
  let shadow = { effects: [], tint: null };
  if (shadowRef != null) {
    const target = isAlias(shadowRef) ? graph.byPath.get(aliasPath(shadowRef)) : null;
    if (target?.type !== 'shadow') {
      throw new Error(
        `No Figma effect mapping for ${path}.shadow: expected an alias to a shadow token`,
      );
    }
    shadow = shadowEffects(graph, target);
  }
  return {
    ...base,
    ...shadow,
    pairsWith: { surface: pairOf('surface'), border: pairOf('border') },
  };
}

// ── Brand and density axes ───────────────────────────────────────────────────
/**
 * Demo tenant overlays (tenants/<slug>/tokens.json, chosen and validated by
 * scripts/lib/figma-brand-modes.mjs) become two more collections, mirroring the
 * CSS buildTenantCSS emits:
 *
 *   Hirobius/Brand    one mode per brand: the base mode plus each demo tenant.
 *                     One variable per overridden path, per variant: Light and
 *                     Dark when the path is themed, Comfortable and Compact when
 *                     a tenant compacts it, else one. The base mode holds the
 *                     base token's value; a tenant mode holds its override, or
 *                     the base value where it has none.
 *   Hirobius/Density  Comfortable and Compact. One variable per compacted path,
 *                     aliasing that path's two Brand variants.
 *
 * The token's own variable keeps its path, collection and bindings; its values
 * alias Brand (by theme variant) or Density instead. A frame then resolves
 * theme × brand × density from three independent collection modes, the way
 * [data-theme], [data-brand] and [data-density] combine in CSS. Axis variables
 * carry no scopes (designers bind the token variable) and no codeSyntax (they
 * have no CSS variable of their own).
 */
const BRAND_COLLECTION = { key: 'brand', name: 'Hirobius/Brand' };
const DENSITY_COLLECTION = { key: 'density', name: 'Hirobius/Density' };
export const AXIS_COLLECTION_KEYS = Object.freeze([BRAND_COLLECTION.key, DENSITY_COLLECTION.key]);
export const DENSITY_MODES = Object.freeze(['Comfortable', 'Compact']);
const STYLE_TYPES = new Set(['typography', 'shadow', 'elevation']);

const restValue = (token) => readModes(token.extensions)?.Light ?? token.value;

/** The raw reference a brand source (base token or tenant override) takes in one variant. */
function variantRef(source, variant) {
  if (variant === 'Light' || variant === 'Dark') return modeValue(source, variant);
  if (variant === 'Compact') return readModes(source.extensions)?.Compact ?? restValue(source);
  return restValue(source);
}

const collectionNameOf = (key) =>
  [...TIERS, BRAND_COLLECTION, DENSITY_COLLECTION].find((c) => c.key === key).name;

/**
 * Validates the brand list and collects, per base token path, which demo
 * tenants override it. Refuses what a Brand mode cannot express.
 */
function collectBrandOverrides(graph, brands, excludedBy) {
  const slugs = brands.tenants.map((t) => t.slug);
  slugs.forEach((slug, i) => {
    if (slugs.indexOf(slug) !== i) throw new Error(`Brand mode "${slug}" is listed twice.`);
    if (slug === brands.baseMode) {
      throw new Error(
        `Tenant ${slug} has the same name as the base mode "${brands.baseMode}"; Brand mode names must be unique.`,
      );
    }
  });

  const overrides = new Map();
  for (const { slug, overlay } of brands.tenants) {
    for (const leaf of walkTokens(overlay)) {
      const path = leaf.path.join('.');
      const base = graph.byPath.get(path);
      if (!base) {
        throw new Error(
          `${slug} overrides ${path}, which is not in hirobius.tokens.json (R5: tenants override, they do not extend).`,
        );
      }
      const type = leaf.type ?? base.type;
      if (type !== base.type) {
        throw new Error(
          `${slug} overrides ${path} as ${type}, but the base token is ${base.type}.`,
        );
      }
      if (excludedBy.has(path)) continue;
      if (STYLE_TYPES.has(type) || !FIGMA_TYPE[type]) {
        throw new Error(
          `${slug} overrides ${path}, a ${type} token: text and effect styles have no modes, so a Brand mode cannot carry it. Override the scalar tokens it aliases instead.`,
        );
      }
      if (!overrides.has(path)) overrides.set(path, new Map());
      overrides.get(path).set(slug, { ...leaf, type });
    }
  }
  return overrides;
}

/**
 * Adds the Brand and Density collections for `brands` and points each
 * overridden token variable at them.
 *
 * @param {object} graph
 * @param {{ baseMode: string, tenants: Array<{ slug: string, overlay: object }> }} brands
 * @param {{ excludedBy: Map<string,string>, pendingByPath: Map<string,object> }} context
 * @returns {object[]} Collections to append to the model.
 */
function buildBrandAxes(graph, brands, { excludedBy, pendingByPath }) {
  const overrides = collectBrandOverrides(graph, brands, excludedBy);
  const brandModes = [brands.baseMode, ...brands.tenants.map((t) => t.slug)];
  const brandVariables = [];
  const densityVariables = [];

  for (const base of graph.tokens) {
    const path = base.path.join('.');
    const bySlug = overrides.get(path);
    if (!bySlug) continue;
    const item = pendingByPath.get(path);
    const overriders = [...bySlug.keys()];
    const themedBy = overriders.find((slug) => isThemed(bySlug.get(slug)));
    const compactedBy = overriders.find(
      (slug) => readModes(bySlug.get(slug).extensions)?.Compact !== undefined,
    );
    const themed = isThemed(base) || Boolean(themedBy);
    if (themed && compactedBy) {
      throw new Error(
        `${path} varies by theme (Light/Dark) and by density (Compact, from ${compactedBy}); build-tokens emits no brand × theme × density CSS (ADR-022), so neither can Figma. Keep one axis per path.`,
      );
    }
    const home = item.themed ? THEME_TIER : base.path[0];
    if (themed && home !== THEME_TIER) {
      throw new Error(
        `${themedBy} themes ${path}, but it lives in ${collectionNameOf(home)}, which has no Light/Dark modes. Give ${path} Light/Dark modes in hirobius.tokens.json first (that moves it to Hirobius/Semantic).`,
      );
    }

    const axis = themed ? 'theme' : compactedBy ? 'density' : null;
    const variants = axis === 'theme' ? THEME_MODES : axis === 'density' ? DENSITY_MODES : [null];
    const resolvedType = FIGMA_TYPE[base.type];
    const unit = unitOf(graph, base);
    const overriddenBy = overriders.map((slug) => `${slug} ([data-brand="${slug}"])`).join(', ');
    const brandPath = (variant) => `brand.${path}${variant ? `.${variant}` : ''}`;

    for (const variant of variants) {
      const where =
        variant === null ? '' : axis === 'theme' ? ` in ${variant}` : ` at ${variant} density`;
      brandVariables.push({
        path: brandPath(variant),
        name: [...base.path, ...(variant ? [variant] : [])].join('/'),
        resolvedType,
        unit,
        description: `Brand value of ${path}${where}. ${brands.baseMode}: the base token. Overridden by ${overriddenBy}.`,
        scopes: [],
        hiddenFromPublishing: false,
        codeSyntax: {},
        valuesByMode: Object.fromEntries(
          brandModes.map((mode) => {
            const source = bySlug.get(mode) ?? base;
            return [mode, modeEntry(graph, variantRef(source, variant), base.type)];
          }),
        ),
      });
    }

    if (axis === 'density') {
      densityVariables.push({
        path: `density.${path}`,
        name: base.path.join('/'),
        resolvedType,
        unit,
        description: `Density value of ${path}: Comfortable is the rest value, Compact applies under [data-density="compact"]. Each aliases its ${BRAND_COLLECTION.name} variant.`,
        scopes: [],
        hiddenFromPublishing: false,
        codeSyntax: {},
        valuesByMode: Object.fromEntries(
          DENSITY_MODES.map((mode) => [mode, { alias: brandPath(mode) }]),
        ),
      });
      item.entryFor = () => ({ alias: `density.${path}` });
      item.axisNote = `Varies by brand and density: its value comes from ${DENSITY_COLLECTION.name}.`;
    } else {
      item.entryFor = (mode) => ({ alias: brandPath(axis === 'theme' ? mode : null) });
      item.axisNote = `Varies by brand: its value comes from ${BRAND_COLLECTION.name}.`;
    }
  }

  const axes = [
    {
      ...BRAND_COLLECTION,
      modes: brandModes,
      hiddenFromPublishing: false,
      variables: brandVariables,
    },
  ];
  if (densityVariables.length > 0) {
    axes.push({
      ...DENSITY_COLLECTION,
      modes: [...DENSITY_MODES],
      hiddenFromPublishing: false,
      variables: densityVariables,
    });
  }
  return axes;
}

// ── Build ────────────────────────────────────────────────────────────────────
/** A scalar token → a pending variable (mode values are read once modes are known). */
function tokenVariable(graph, token) {
  return {
    path: token.path.join('.'),
    segments: token.path,
    tokenType: token.type,
    themed: isThemed(token),
    unit: unitOf(graph, token),
    description: token.description ?? '',
    entryFor: (mode) =>
      modeEntry(graph, mode === SINGLE_MODE ? token.value : modeValue(token, mode), token.type),
  };
}

/** Refuses a variable whose alias points at something Figma will not have. */
function assertAliasesResolve(collections, excludedBy) {
  const exported = new Set(collections.flatMap((c) => c.variables.map((v) => v.path)));
  for (const v of collections.flatMap((c) => c.variables)) {
    for (const entry of Object.values(v.valuesByMode)) {
      if (!entry.alias || exported.has(entry.alias)) continue;
      const why = excludedBy.has(entry.alias)
        ? `which is not in Figma (${excludedBy.get(entry.alias)}) — declare ${v.path} in NOT_IN_FIGMA too, or alias a token Figma has`
        : 'which has no Figma variable';
      throw new Error(`${v.path} aliases ${entry.alias}, ${why}.`);
    }
  }
}

/**
 * Builds the Figma model for a token graph.
 *
 * @param {object} raw  Parsed hirobius.tokens.json (or a fixture graph).
 * @param {{ brands?: { baseMode: string, tenants: Array<{ slug: string, overlay: object }> } | null }} [options]
 *   brands: demo tenant overlays for the Brand and Density collections
 *   (scripts/lib/figma-brand-modes.mjs loads them). Omitted: no axis collections.
 * @returns {object}    The model written to figma/model.json.
 */
export function buildFigmaModel(raw, { brands = null } = {}) {
  const graph = createGraph(raw);
  const notInFigma = NOT_IN_FIGMA.map(({ id, reason }) => ({ id, reason, tokens: [] }));
  const exclude = (id, path) => notInFigma.find((e) => e.id === id).tokens.push(path);
  const excludedBy = new Map();
  const pending = [];
  const textStyles = [];
  const effectStyles = [];

  for (const token of graph.tokens) {
    const path = token.path.join('.');
    if (readModes(token.extensions)?.Compact !== undefined) {
      throw new Error(
        `${path} declares a Compact mode in hirobius.tokens.json, but build-tokens emits [data-density] CSS only for tenant overlays (ADR-022), so Figma would show a value the browser never applies. Move the Compact value into a tenant overlay, or teach build-tokens to emit it first.`,
      );
    }
    const exclusion = NOT_IN_FIGMA.find((e) => e.matches?.(token, graph));
    if (exclusion) {
      exclude(exclusion.id, path);
      excludedBy.set(path, exclusion.id);
    } else if (token.type === 'typography') {
      const { variables, textStyle, excluded } = expandTypography(graph, token);
      pending.push(...variables);
      textStyles.push(textStyle);
      for (const [id, subPath] of excluded) exclude(id, subPath);
    } else if (token.type === 'shadow' || token.type === 'elevation') {
      effectStyles.push(effectStyleFor(graph, token));
    } else if (FIGMA_TYPE[token.type]) {
      pending.push(tokenVariable(graph, token));
    } else {
      throw new Error(
        `No Figma mapping for ${path} (type ${token.type}) — map the type in scripts/lib/figma-model.mjs or declare it in NOT_IN_FIGMA with a reason.`,
      );
    }
  }

  const axes = brands?.tenants?.length
    ? buildBrandAxes(graph, brands, {
        excludedBy,
        pendingByPath: new Map(
          pending.filter((item) => item.path).map((item) => [item.path, item]),
        ),
      })
    : [];

  const homeOf = (item) => (item.themed ? THEME_TIER : item.segments[0]);
  const tierCollections = TIERS.map(({ key, name }) => {
    const members = pending.filter((item) => homeOf(item) === key);
    const modes = members.some((item) => item.themed) ? [...THEME_MODES] : [SINGLE_MODE];
    return {
      key,
      name,
      modes,
      hiddenFromPublishing: key === 'primitive',
      variables: members.map((item) => {
        const resolvedType = FIGMA_TYPE[item.tokenType];
        return {
          path: item.segments.join('.'),
          name: item.segments.slice(1).join('/'),
          resolvedType,
          unit: item.unit,
          description: [
            item.description,
            key === item.segments[0] ? null : THEME_HOME_NOTE,
            item.axisNote,
          ]
            .filter(Boolean)
            .join(' '),
          scopes: scopesFor(item.segments, item.tokenType, resolvedType),
          hiddenFromPublishing: item.segments[0] === 'primitive',
          codeSyntax: { WEB: `var(--${item.segments.join('-')})` },
          valuesByMode: Object.fromEntries(modes.map((mode) => [mode, item.entryFor(mode)])),
        };
      }),
    };
  });
  const collections = [...tierCollections, ...axes];
  assertAliasesResolve(collections, excludedBy);

  return {
    schemaVersion: 1,
    source: 'hirobius.tokens.json',
    collections,
    textStyles,
    effectStyles,
    notInFigma,
  };
}
