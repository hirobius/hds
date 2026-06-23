/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-contrast.mjs
 *
 * WCAG 2.1 contrast ratio checker for HDS semantic color pairs.
 * Reads hirobius.tokens.json, resolves primitive + semantic color aliases,
 * and reports contrast ratios for critical text/bg pairings in both
 * light and dark mode.
 *
 * Usage: node scripts/check-contrast.mjs
 * Exits 0 if all pairs pass WCAG AA. Exits 1 if any pair fails.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokenPath = resolve(__dirname, '../hirobius.tokens.json');

// ── Token loading ─────────────────────────────────────────────

const tokens = JSON.parse(readFileSync(tokenPath, 'utf8'));

// ── Path resolver ─────────────────────────────────────────────

/**
 * Traverse a dot-notation path through the token object.
 * Returns the node at that path, or undefined if not found.
 */
function getByPath(obj, path) {
  return path.split('.').reduce((node, key) => {
    if (node == null) return undefined;
    return node[key];
  }, obj);
}

/**
 * Resolve an alias string like "{primitive.color.neutral.white}"
 * to its hex $value, following chains up to 10 levels deep.
 */
function resolveAlias(ref, maxDepth = 10) {
  let current = ref;
  for (let i = 0; i < maxDepth; i++) {
    const match = typeof current === 'string' && current.match(/^\{(.+)\}$/);
    if (!match) break;
    const node = getByPath(tokens, match[1]);
    if (node == null) {
      throw new Error(`Token path not found: ${match[1]}`);
    }
    current = node.$value ?? node;
  }
  return current;
}

/**
 * Resolve a semantic color token to a concrete hex string for a given mode.
 * For light: uses $value (after alias resolution).
 * For dark:  uses $extensions['com.figma.variables'].modes.Dark, falls back to $value.
 */
function resolveSemanticHex(dotPath, mode) {
  const node = getByPath(tokens, dotPath);
  if (!node) throw new Error(`Semantic token not found: ${dotPath}`);

  let rawValue;

  if (mode === 'dark') {
    const darkAlias =
      node.$extensions?.['com.figma.variables']?.modes?.Dark;
    rawValue = darkAlias != null ? darkAlias : node.$value;
  } else {
    rawValue = node.$value;
  }

  const color = resolveAlias(rawValue);
  if (typeof color !== 'string' || !(/^#[0-9a-fA-F]{6}$/.test(color) || /^oklch\(/i.test(color))) {
    throw new Error(
      `Could not resolve ${dotPath} (${mode}) to a hex or oklch color. Got: ${JSON.stringify(color)}`
    );
  }
  return color.toLowerCase();
}

// ── WCAG luminance + contrast ─────────────────────────────────
// Accepts hex (#rrggbb) and oklch(L C H). The accent ramp is uniformly oklch
// (some stops are out of sRGB gamut), so colors are channel-clamped to sRGB
// before luminance — matching what the browser renders.

const srgbLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function oklchToSrgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin2srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  return {
    r: clamp01(lin2srgb(clamp01(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_))),
    g: clamp01(lin2srgb(clamp01(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_))),
    b: clamp01(lin2srgb(clamp01(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_))),
  };
}

function colorToLuminance(color) {
  let r, g, b;
  if (color.startsWith('#')) {
    r = parseInt(color.slice(1, 3), 16) / 255;
    g = parseInt(color.slice(3, 5), 16) / 255;
    b = parseInt(color.slice(5, 7), 16) / 255;
  } else {
    const m = /^oklch\(\s*([^)]+)\)/i.exec(color);
    const [L, C, H] = m[1].split(/\s+/).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)));
    ({ r, g, b } = oklchToSrgb(L, C, H));
  }
  return 0.2126 * srgbLin(r) + 0.7152 * srgbLin(g) + 0.0722 * srgbLin(b);
}

function contrastRatio(c1, c2) {
  const L1 = colorToLuminance(c1);
  const L2 = colorToLuminance(c2);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// ── WCAG thresholds ───────────────────────────────────────────

const AA_NORMAL = 4.5;
const AAA_NORMAL = 7.0;

function passAA(ratio)  { return ratio >= AA_NORMAL; }
function passAAA(ratio) { return ratio >= AAA_NORMAL; }

// ── Pairs to check ────────────────────────────────────────────

const PAIRS = [
  {
    label: 'content.primary / surface.page',
    text: 'semantic.color.content.primary',
    bg:   'semantic.color.surface.page',
  },
  {
    label: 'content.primary / surface.raised',
    text: 'semantic.color.content.primary',
    bg:   'semantic.color.surface.raised',
  },
  {
    label: 'content.primary / surface.overlay',
    text: 'semantic.color.content.primary',
    bg:   'semantic.color.surface.overlay',
  },
  {
    label: 'content.secondary / surface.page',
    text: 'semantic.color.content.secondary',
    bg:   'semantic.color.surface.page',
  },
  {
    label: 'content.secondary / surface.raised',
    text: 'semantic.color.content.secondary',
    bg:   'semantic.color.surface.raised',
  },
  {
    label: 'content.secondary / surface.overlay',
    text: 'semantic.color.content.secondary',
    bg:   'semantic.color.surface.overlay',
  },
  {
    label: 'content.onAccent / surface.accent',
    text: 'semantic.color.content.onAccent',
    bg:   'semantic.color.surface.accent',
  },
  // Feedback roles as text/labels on the raised (paper/card) surface. Each is
  // mode-aware; the contract asserts AA (≥4.5:1) on its own scheme's surface so
  // a bright dark-scheme hue can never ship as light-mode text (the class of bug
  // consumers kept rediscovering). info uses cyan (decoupled from brand blue).
  {
    label: 'feedback.success / surface.raised',
    text: 'semantic.color.feedback.success',
    bg:   'semantic.color.surface.raised',
  },
  {
    label: 'feedback.warning / surface.raised',
    text: 'semantic.color.feedback.warning',
    bg:   'semantic.color.surface.raised',
  },
  {
    label: 'feedback.info / surface.raised',
    text: 'semantic.color.feedback.info',
    bg:   'semantic.color.surface.raised',
  },
  {
    label: 'feedback.error / surface.raised',
    text: 'semantic.color.feedback.error',
    bg:   'semantic.color.surface.raised',
  },
];

// ── Main ──────────────────────────────────────────────────────

const COL_PAIR  = 34;
const COL_RATIO =  8;

function fmt(ratio) {
  return `${ratio.toFixed(1)}:1`.padEnd(COL_RATIO);
}

function _aaGlyph(ratio)  { return passAA(ratio)  ? '✓' : '✗'; }
function _aaaGlyph(ratio) { return passAAA(ratio)  ? '✓' : '✗'; }

const results = PAIRS.map(({ label, text, bg }) => {
  const textLight = resolveSemanticHex(text, 'light');
  const bgLight   = resolveSemanticHex(bg,   'light');
  const textDark  = resolveSemanticHex(text,  'dark');
  const bgDark    = resolveSemanticHex(bg,    'dark');

  const lightRatio = contrastRatio(textLight, bgLight);
  const darkRatio  = contrastRatio(textDark,  bgDark);

  return { label, lightRatio, darkRatio };
});

const failures = results.filter(
  ({ lightRatio, darkRatio }) => !passAA(lightRatio) || !passAA(darkRatio)
);

if (failures.length === 0) {
  console.log('\n✓ WCAG contrast check passed — all pairs meet AA.\n');
} else {
  console.log('\n✗ WCAG contrast check FAILED — the following pairs do not meet AA:\n');
  for (const { label, lightRatio, darkRatio } of failures) {
    const lightFail = !passAA(lightRatio) ? ` light ${lightRatio.toFixed(1)}:1 (needs ${AA_NORMAL}:1)` : '';
    const darkFail  = !passAA(darkRatio)  ? ` dark ${darkRatio.toFixed(1)}:1 (needs ${AA_NORMAL}:1)`   : '';
    console.log(`  ✗ ${label}:${lightFail}${darkFail}`);
  }
  console.log('');
}

// ── Table ─────────────────────────────────────────────────────

const header =
  'Pair'.padEnd(COL_PAIR) +
  'Light'.padEnd(COL_RATIO) +
  'Dark'.padEnd(COL_RATIO) +
  'AA (L/D)'.padEnd(12) +
  'AAA (L/D)';

console.log('  ' + header);
console.log('  ' + '─'.repeat(header.length));

for (const { label, lightRatio, darkRatio } of results) {
  const aaLight  = passAA(lightRatio)  ? '✓' : '✗';
  const aaDark   = passAA(darkRatio)   ? '✓' : '✗';
  const aaaLight = passAAA(lightRatio) ? '✓' : '✗';
  const aaaDark  = passAAA(darkRatio)  ? '✓' : '✗';

  const row =
    label.padEnd(COL_PAIR) +
    fmt(lightRatio) +
    fmt(darkRatio) +
    `${aaLight}/${aaDark}`.padEnd(12) +
    `${aaaLight}/${aaaDark}`;

  console.log('  ' + row);
}

console.log('');

process.exit(failures.length > 0 ? 1 : 0);


