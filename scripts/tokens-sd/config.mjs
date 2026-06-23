/**
 * Hirobius Design System — Style Dictionary multi-format token emitter.
 *
 * STATUS: parallel / additive. This does NOT replace scripts/build-tokens.mjs
 * (still the source of truth for tokens.css, the TS bridge, dark mode, tenant
 * overlays, and composite expansion). This emitter graduates the
 * scripts/poc/style-dictionary-poc into a production multi-target generator for
 * the **scalar variable layer**, proving RFC #3 Tier 1 ("one source, many
 * targets"): CSS vars, SCSS, JS/ESM, JSON, and React Native — all from
 * hirobius.tokens.json.
 *
 * Parity strategy: token VALUES are formatted by build-tokens.mjs's canonical
 * `valueToCSS` (imported, not reimplemented), so every emitted value is
 * byte-identical to tokens.css for the covered subset. Style Dictionary owns
 * naming + per-platform file emission. scripts/tokens-sd/parity.mjs verifies
 * the CSS output equals the canonical generator LIVE (no frozen snapshot — the
 * POC's stale expected.css drift is designed out).
 *
 * SCOPE (covered): every scalar token across all four tiers — primitive,
 * semantic, component, role. Semantic/component/role aliases are preserved as
 * `var(--…)` (theme-aware); primitives resolve to raw values, matching
 * build-tokens.mjs exactly.
 *
 * DEFERRED (phase 2 — composite expansion + modes): typography, motion,
 * transition, elevation, and shadow composites; the `[data-theme="dark"]`
 * mode block; and the `[data-tenant]` overlays. These need composite/mode
 * machinery beyond a flat var map and are intentionally out of this emitter.
 *
 * Run:    node scripts/tokens-sd/build.mjs
 * Verify: node scripts/tokens-sd/parity.mjs   (pnpm check:tokens-sd)
 */

import StyleDictionary from 'style-dictionary';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, mkdtempSync, readFileSync as read, rmSync } from 'fs';
import { tmpdir } from 'os';
import {
  walkTokens,
  valueToCSS,
  expandTypography,
  expandMotion,
  expandTransition,
  expandElevation,
} from '../build-tokens.mjs';
import { normalizeColor } from './color.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

/**
 * Composite token types — one token expands to many CSS vars. Excluded from the
 * scalar path; emitted via the build-tokens.mjs expanders (C5). `shadow` is a
 * single-var scalar (handled by valueToCSS), so it is NOT composite.
 */
export const COMPOSITE_TYPES = new Set(['typography', 'motion', 'transition', 'elevation']);

const EXPANDERS = {
  typography: expandTypography,
  motion: expandMotion,
  transition: expandTransition,
  elevation: expandElevation,
};

/** Read the canonical DTCG source. */
export function readRawTokens() {
  return JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));
}

/**
 * Compute the covered scalar var map the SAME way build-tokens.mjs builds the
 * :root layer: primitives resolve aliases, everything else preserves them as
 * var(). Returns an array of { path, name, value } descriptors.
 *
 * @param {object} rawTokens  full DTCG token tree
 * @param {boolean} resolveAll  force-resolve every alias to a raw value (React
 *                              Native target — no CSS var support)
 */
export function collectScalarTokens(rawTokens, { resolveAll = false } = {}) {
  const out = [];
  for (const { path, type, value } of walkTokens(rawTokens)) {
    if (COMPOSITE_TYPES.has(type)) continue;
    const preserveAlias = resolveAll ? false : path[0] !== 'primitive';
    const css = valueToCSS(value, type, preserveAlias, rawTokens);
    if (css == null) continue;
    out.push({ path, name: path.join('-'), value: String(css), type });
  }
  return out;
}

/** Set a nested value at `path` inside `obj`, creating intermediate objects. */
function setNested(obj, path, leaf) {
  let node = obj;
  for (let i = 0; i < path.length - 1; i++) {
    node[path[i]] ??= {};
    node = node[path[i]];
  }
  node[path.at(-1)] = leaf;
}

/** Build a Style Dictionary `tokens` tree from pre-computed scalar leaves. */
function toSdTree(scalarTokens) {
  const tree = {};
  for (const { path, value } of scalarTokens) setNested(tree, path, { value });
  return tree;
}

// ── Name transform: join path segments with '-', preserve camelCase ──────────
// Mirrors build-tokens.mjs `pathToCSSVar`: parts.join('-'), no kebab conversion.
const nameHdsPreserveCamel = {
  type: 'name',
  transform: (token) => token.path.join('-'),
};

// ── Format helpers ───────────────────────────────────────────────────────────
const cssFormat = (selector) => async ({ dictionary }) =>
  `${selector} {\n` +
  dictionary.allTokens.map((t) => `  --${t.name}: ${t.value};`).join('\n') +
  `\n}\n`;

const scssFormat = async ({ dictionary }) =>
  dictionary.allTokens.map((t) => `$${t.name}: ${t.value};`).join('\n') + '\n';

const jsonFlatFormat = async ({ dictionary }) =>
  JSON.stringify(
    Object.fromEntries(dictionary.allTokens.map((t) => [`--${t.name}`, t.value])),
    null,
    2,
  ) + '\n';

const nestedTreeFormat = (exportName) => async ({ dictionary }) => {
  const tree = {};
  for (const t of dictionary.allTokens) setNested(tree, t.path, t.value);
  return (
    `// Generated by scripts/tokens-sd — do not edit manually.\n` +
    `export const ${exportName} = ${JSON.stringify(tree, null, 2)} as const;\n` +
    `export default ${exportName};\n`
  );
};

/**
 * Run Style Dictionary for one token set and return the produced file strings
 * keyed by logical name. We capture output in-memory (no disk writes here) so
 * both build.mjs and parity.mjs can consume it.
 */
async function runSd(sdTree, formats) {
  const buildPath = mkdtempSync(join(tmpdir(), 'hds-sd-')) + '/';
  const sd = new StyleDictionary({
    tokens: sdTree,
    hooks: {
      transforms: { 'name/hds-preserve-camel': nameHdsPreserveCamel },
      formats: {
        'hds/css': cssFormat(':root'),
        'hds/scss': scssFormat,
        'hds/json': jsonFlatFormat,
        'hds/js': nestedTreeFormat('hdsTokens'),
        'hds/rn': nestedTreeFormat('hdsTokensNative'),
      },
    },
    platforms: {
      out: {
        buildPath,
        transforms: ['name/hds-preserve-camel'],
        files: formats.map((f) => ({ destination: f.key, format: f.format })),
      },
    },
    log: { verbosity: 'silent' },
  });

  await sd.buildAllPlatforms();
  const captured = {};
  for (const f of formats) captured[f.key] = read(buildPath + f.key, 'utf8');
  rmSync(buildPath, { recursive: true, force: true });
  return captured;
}

/**
 * Generate every target. Returns { 'tokens.vars.css', 'tokens.vars.scss',
 * 'tokens.json', 'tokens.js', 'tokens.native.js' } as strings.
 */
export async function generateAll(rawTokens = readRawTokens()) {
  const themeAware = toSdTree(collectScalarTokens(rawTokens));

  const themed = await runSd(themeAware, [
    { key: 'tokens.vars.css', format: 'hds/css' },
    { key: 'tokens.vars.scss', format: 'hds/scss' },
    { key: 'tokens.json', format: 'hds/json' },
    { key: 'tokens.js', format: 'hds/js' },
  ]);
  // C5: append composite-expanded vars to the var-layer targets (CSS/SCSS/JSON).
  const composites = collectCompositeVars(rawTokens);
  themed['tokens.vars.css'] = appendCssVars(themed['tokens.vars.css'], composites);
  themed['tokens.vars.scss'] += composites.map((v) => `$${v.name}: ${v.value};`).join('\n') + '\n';
  const jsonObj = JSON.parse(themed['tokens.json']);
  for (const v of composites) jsonObj[`--${v.name}`] = v.value;
  themed['tokens.json'] = JSON.stringify(jsonObj, null, 2) + '\n';

  const native = buildNativeTargets(rawTokens);
  const literal = buildLiteralTargets(rawTokens);

  return { ...themed, ...native, ...literal };
}

// ── C4: native targets (resolved sRGB literals — iOS / Android / RN) ──────────

/** ['primitive','color','blue','500'] → 'primitiveColorBlue500' */
function camelId(path) {
  return path
    .map((seg, i) => (i === 0 ? seg : seg.charAt(0).toUpperCase() + seg.slice(1)))
    .join('');
}

/**
 * Reduce a resolved scalar token to a native-emittable form, or null if it has
 * no native representation (CSS-only dims like clamp()/ch/vw, motion easings,
 * bare HSL channel components). Native = sRGB literals + unitless numbers.
 */
export function nativizeToken(t) {
  switch (t.type) {
    case 'color': {
      const c = normalizeColor(t.value);
      return c ? { ...t, kind: 'color', hex: c.hex, rgb: c.rgb, inGamut: c.inGamut } : null;
    }
    case 'dimension': {
      const m = /^(-?\d+(?:\.\d+)?)px$/.exec(t.value);
      return m ? { ...t, kind: 'dimension', num: Number(m[1]) } : null;
    }
    case 'number':
    case 'fontWeight': {
      const n = Number(t.value);
      return Number.isNaN(n) ? null : { ...t, kind: 'number', num: n };
    }
    case 'duration': {
      const m = /^(-?\d+(?:\.\d+)?)(ms|s)$/.exec(t.value);
      if (!m) return null;
      return { ...t, kind: 'number', num: m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]) };
    }
    case 'fontFamily':
      return { ...t, kind: 'font', str: t.value };
    default:
      return null; // cubicBezier, spring, shadow, etc. — no native scalar form
  }
}

/** Build the native token set; returns { native: [...], skipped: [...] }. */
export function collectNativeTokens(rawTokens = readRawTokens()) {
  const native = [];
  const skipped = [];
  for (const t of collectScalarTokens(rawTokens, { resolveAll: true })) {
    const n = nativizeToken(t);
    if (n) native.push(n);
    else skipped.push(t);
  }
  return { native, skipped };
}

const f3 = (n) => n.toFixed(3);

function emitRn(native) {
  const tree = {};
  for (const t of native) {
    const val = t.kind === 'color' ? t.hex : t.kind === 'font' ? t.str : t.num;
    setNested(tree, t.path, val);
  }
  return (
    `// Generated by scripts/tokens-sd (C4 native) — do not edit manually.\n` +
    `// React Native: colors are sRGB hex, dimensions/numbers are unitless.\n` +
    `export const hdsTokensNative = ${JSON.stringify(tree, null, 2)} as const;\n` +
    `export default hdsTokensNative;\n`
  );
}

function emitSwift(native) {
  const colors = native.filter((t) => t.kind === 'color');
  const metrics = native.filter((t) => t.kind === 'dimension' || t.kind === 'number');
  const fonts = native.filter((t) => t.kind === 'font');
  const block = (name, type, rows) =>
    `public enum ${name} {\n` + rows.join('\n') + `\n}\n`;
  return (
    `// Generated by scripts/tokens-sd (C4 native) — do not edit manually.\n` +
    `import UIKit\n\n` +
    block(
      'HDSColor',
      'UIColor',
      colors.map(
        (t) =>
          `  public static let ${camelId(t.path)} = UIColor(red: ${f3(t.rgb.r)}, green: ${f3(t.rgb.g)}, blue: ${f3(t.rgb.b)}, alpha: 1)` +
          (t.inGamut ? '' : '  // gamut-clamped from oklch'),
      ),
    ) +
    `\n` +
    block(
      'HDSMetric',
      'CGFloat',
      metrics.map((t) => `  public static let ${camelId(t.path)}: CGFloat = ${t.num}`),
    ) +
    `\n` +
    block('HDSFont', 'String', fonts.map((t) => `  public static let ${camelId(t.path)} = ${JSON.stringify(t.str)}`))
  );
}

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function emitAndroid(native) {
  const rows = [];
  for (const t of native) {
    const name = t.path.join('_');
    if (t.kind === 'color') {
      rows.push(`  <color name="${name}">${t.hex}</color>` + (t.inGamut ? '' : ' <!-- gamut-clamped from oklch -->'));
    } else if (t.kind === 'dimension') {
      rows.push(`  <dimen name="${name}">${t.num}dp</dimen>`);
    } else if (t.kind === 'number') {
      rows.push(`  <item name="${name}" format="float" type="dimen">${t.num}</item>`);
    } else if (t.kind === 'font') {
      rows.push(`  <string name="${name}">${xmlEscape(t.str)}</string>`);
    }
  }
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<!-- Generated by scripts/tokens-sd (C4 native) — do not edit manually. -->\n` +
    `<resources>\n${rows.join('\n')}\n</resources>\n`
  );
}

/** Produce the three native target strings from one resolved source. */
export function buildNativeTargets(rawTokens = readRawTokens()) {
  const { native } = collectNativeTokens(rawTokens);
  return {
    'tokens.native.js': emitRn(native),
    'tokens.ios.swift': emitSwift(native),
    'tokens.android.xml': emitAndroid(native),
  };
}

// ── C9: resolved-literal targets (for frameworks that do color math) ──────────
// var(--…) can't be passed to color functions like MUI's alpha(). These targets
// resolve every alias to a LIGHT-MODE sRGB literal (colors → hex; dimensions
// keep their CSS unit). Dark-mode literals await the mode model (C6).

/** Resolve one scalar token to a literal value: colors → hex, else CSS string. */
function literalValue(t) {
  if (t.type === 'color') {
    const c = normalizeColor(t.value);
    return c ? c.hex : t.value; // bare HSL components etc. pass through
  }
  return t.value;
}

// ── C5: composite expansion (typography / motion / transition / elevation) ────
// One composite token → many CSS vars. Reuses build-tokens.mjs's exported
// expanders so the emitted vars are byte-identical to tokens.css. Returns
// [{ name, value }] (name has no leading '--'). Composites are var-layer only —
// not added to the path-based JS/native/literal trees.
export function collectCompositeVars(rawTokens = readRawTokens()) {
  const out = [];
  for (const { path, type, value } of walkTokens(rawTokens)) {
    const fn = EXPANDERS[type];
    if (!fn) continue;
    for (const { cssVar, cssValue } of fn(path, value)) {
      if (cssValue != null) out.push({ name: cssVar.replace(/^--/, ''), value: String(cssValue) });
    }
  }
  return out;
}

/** Inject extra `--name: value;` lines before the closing brace of a :root block. */
function appendCssVars(css, vars) {
  if (!vars.length) return css;
  const lines = vars.map((v) => `  --${v.name}: ${v.value};`).join('\n');
  return css.replace(/\n\}\n$/, `\n${lines}\n}\n`);
}

/** Nested literal token tree keyed by token path (consumed by framework presets). */
export function buildLiteralTree(rawTokens = readRawTokens()) {
  const tree = {};
  for (const t of collectScalarTokens(rawTokens, { resolveAll: true })) {
    setNested(tree, t.path, literalValue(t));
  }
  return tree;
}

function buildLiteralTargets(rawTokens) {
  const resolved = collectScalarTokens(rawTokens, { resolveAll: true });
  const cssLines = resolved.map((t) => `  --${t.name}: ${literalValue(t)};`);
  const tree = buildLiteralTree(rawTokens);
  return {
    'tokens.literal.css': `:root {\n${cssLines.join('\n')}\n}\n`,
    'tokens.literal.js':
      `// Generated by scripts/tokens-sd (C9 literal) — do not edit manually.\n` +
      `// Light-mode sRGB literals; safe for color math (MUI alpha(), etc.).\n` +
      `export const hdsTokensLiteral = ${JSON.stringify(tree, null, 2)} as const;\n` +
      `export default hdsTokensLiteral;\n`,
  };
}

/**
 * Structural validation of the native token model (not the rendered text, so
 * the "gamut-clamped from oklch" comments don't false-positive). Guarantees no
 * CSS-only value (oklch/var/clamp/px-unit) reaches a native literal.
 */
export function validateNative(rawTokens = readRawTokens()) {
  const { native, skipped } = collectNativeTokens(rawTokens);
  const problems = [];
  let clamped = 0;
  for (const t of native) {
    if (t.kind === 'color') {
      if (!/^#[0-9A-F]{6}$/.test(t.hex)) problems.push(`${t.name}: bad hex ${t.hex}`);
      if (!t.inGamut) clamped++;
    } else if (t.kind === 'dimension' || t.kind === 'number') {
      if (typeof t.num !== 'number' || !Number.isFinite(t.num))
        problems.push(`${t.name}: non-finite number ${t.num}`);
    } else if (t.kind === 'font') {
      if (typeof t.str !== 'string' || t.str.length === 0)
        problems.push(`${t.name}: empty font value`);
    }
  }
  // Reason-bucket the skips for transparency.
  const skipReasons = {};
  for (const t of skipped) {
    const reason =
      t.type === 'dimension' ? 'non-px dimension (clamp/ch/vw/%)' :
      t.type === 'cubicBezier' || t.type === 'spring' ? 'motion easing (no native scalar)' :
      t.type === 'color' ? 'unconvertible color (bare hsl components)' :
      `type:${t.type}`;
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  }
  return { nativeCount: native.length, clamped, skipped: skipped.length, skipReasons, problems };
}

/** Convenience for parity: just the CSS string. */
export async function generateCss(rawTokens = readRawTokens()) {
  return (await generateAll(rawTokens))['tokens.vars.css'];
}
