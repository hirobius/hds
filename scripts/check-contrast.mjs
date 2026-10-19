/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-contrast.mjs
 *
 * WCAG 2.1 contrast ratio checker for HDS semantic color pairs.
 * Reads hirobius.tokens.json, resolves primitive + semantic color aliases,
 * and reports contrast ratios for critical text/bg pairings in both
 * light and dark mode. Also checks a non-text tier (WCAG 2.1 §1.4.11):
 * border tokens that bound an interactive control's boundary, where the
 * border is the only affordance, must hit a 3:1 floor against the surface
 * they sit on — the same floor text pairs get at 4.5:1 does not apply to
 * a 1px stroke (#230).
 *
 * Usage: node scripts/check-contrast.mjs
 * Exits 0 if all pairs pass WCAG AA (text) and the 3:1 floor (non-text).
 * Exits 1 if any pair fails.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readTokenSource } from './lib/token-source.mjs';
import { resolveAlias } from './lib/token-tree.mjs';
import { BASE_PAIRS, PAIRS, NONTEXT_PAIRS } from './lib/contrast-pairs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tokenPath = resolve(__dirname, '../hirobius.tokens.json');

// Fixture mode: proof-of-firing harness supplies a single file via env vars.
// No-op in normal runs.
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// ── Token loading ─────────────────────────────────────────────

const targetFile = isFixtureMode && fixtureFile ? resolve(fixtureFile) : tokenPath;
const tokens = readTokenSource(targetFile);

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
 * Resolve a semantic color token to a concrete hex string for a given mode.
 * For light: uses $value (after alias resolution).
 * For dark:  uses $extensions['com.figma.variables'].modes.Dark, falls back to $value.
 * With an `overlay` (an accent theme), its leaf wins over the base leaf.
 */
/** `base` with each `layer` leaf laid over it, so overlay aliases resolve through the overlay too. */
function layered(base, layer) {
  if (!layer || typeof layer !== 'object' || '$value' in layer) return layer;
  const out = { ...base };
  for (const [k, v] of Object.entries(layer)) out[k] = k in base ? layered(base[k], v) : v;
  return out;
}

function resolveSemanticHex(dotPath, mode, overlay = null) {
  const tree = overlay ? layered(tokens, overlay) : tokens;
  const node = getByPath(tree, dotPath);
  if (!node) throw new Error(`Semantic token not found: ${dotPath}`);

  let rawValue;

  if (mode === 'dark') {
    const darkAlias = node.$extensions?.['com.figma.variables']?.modes?.Dark;
    rawValue = darkAlias != null ? darkAlias : node.$value;
  } else {
    rawValue = node.$value;
  }

  const hex = resolveAlias(rawValue, tree, { maxDepth: 10 });
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(
      `Could not resolve ${dotPath} (${mode}) to a 6-digit hex. Got: ${JSON.stringify(hex)}`,
    );
  }
  return hex.toLowerCase();
}

// ── WCAG luminance + contrast ─────────────────────────────────

function hexToLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hex1, hex2) {
  const L1 = hexToLuminance(hex1);
  const L2 = hexToLuminance(hex2);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// ── WCAG thresholds ───────────────────────────────────────────

const AA_NORMAL = 4.5;
const AAA_NORMAL = 7.0;

function passAA(ratio) {
  return ratio >= AA_NORMAL;
}
function passAAA(ratio) {
  return ratio >= AAA_NORMAL;
}

// Non-text tier — WCAG 2.1 §1.4.11 "Non-text Contrast". Applies to the
// visual boundary of a UI component, not to text. 3:1 is the floor
// regardless of AA/AAA; there is no stricter tier to aim for here.
const AA_NONTEXT = 3.0;

function passNonText(ratio) {
  return ratio >= AA_NONTEXT;
}

// The pairs live in lib/contrast-pairs.mjs so build-stats-json.mjs can count them.

// ── Main ──────────────────────────────────────────────────────

const COL_PAIR = 50;
const COL_RATIO = 8;

function fmt(ratio) {
  return `${ratio.toFixed(1)}:1`.padEnd(COL_RATIO);
}

function _aaGlyph(ratio) {
  return passAA(ratio) ? '✓' : '✗';
}
function _aaaGlyph(ratio) {
  return passAAA(ratio) ? '✓' : '✗';
}

// Fixture mode checks the single fixture file, so accent-theme pairs are left out.
const allPairs = isFixtureMode ? BASE_PAIRS : PAIRS;

const results = allPairs.map(({ label, text, bg, overlay }) => {
  const textLight = resolveSemanticHex(text, 'light', overlay);
  const bgLight = resolveSemanticHex(bg, 'light', overlay);
  const textDark = resolveSemanticHex(text, 'dark', overlay);
  const bgDark = resolveSemanticHex(bg, 'dark', overlay);

  const lightRatio = contrastRatio(textLight, bgLight);
  const darkRatio = contrastRatio(textDark, bgDark);

  return { label, lightRatio, darkRatio };
});

const failures = results.filter(
  ({ lightRatio, darkRatio }) => !passAA(lightRatio) || !passAA(darkRatio),
);

const nonTextResults = NONTEXT_PAIRS.map(({ label, border, bg }) => {
  const borderLight = resolveSemanticHex(border, 'light');
  const bgLight = resolveSemanticHex(bg, 'light');
  const borderDark = resolveSemanticHex(border, 'dark');
  const bgDark = resolveSemanticHex(bg, 'dark');

  const lightRatio = contrastRatio(borderLight, bgLight);
  const darkRatio = contrastRatio(borderDark, bgDark);

  return { label, lightRatio, darkRatio };
});

const nonTextFailures = nonTextResults.filter(
  ({ lightRatio, darkRatio }) => !passNonText(lightRatio) || !passNonText(darkRatio),
);

if (failures.length === 0 && nonTextFailures.length === 0) {
  console.log(
    '\n✓ WCAG contrast check passed — all text pairs meet AA, all non-text pairs meet 3:1.\n',
  );
} else {
  console.log('\n✗ WCAG contrast check FAILED:\n');
  for (const { label, lightRatio, darkRatio } of failures) {
    const lightFail = !passAA(lightRatio)
      ? ` light ${lightRatio.toFixed(1)}:1 (needs ${AA_NORMAL}:1)`
      : '';
    const darkFail = !passAA(darkRatio)
      ? ` dark ${darkRatio.toFixed(1)}:1 (needs ${AA_NORMAL}:1)`
      : '';
    console.log(`  ✗ ${label}:${lightFail}${darkFail}`);
  }
  for (const { label, lightRatio, darkRatio } of nonTextFailures) {
    const lightFail = !passNonText(lightRatio)
      ? ` light ${lightRatio.toFixed(1)}:1 (needs ${AA_NONTEXT}:1 non-text)`
      : '';
    const darkFail = !passNonText(darkRatio)
      ? ` dark ${darkRatio.toFixed(1)}:1 (needs ${AA_NONTEXT}:1 non-text)`
      : '';
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
  const aaLight = passAA(lightRatio) ? '✓' : '✗';
  const aaDark = passAA(darkRatio) ? '✓' : '✗';
  const aaaLight = passAAA(lightRatio) ? '✓' : '✗';
  const aaaDark = passAAA(darkRatio) ? '✓' : '✗';

  const row =
    label.padEnd(COL_PAIR) +
    fmt(lightRatio) +
    fmt(darkRatio) +
    `${aaLight}/${aaDark}`.padEnd(12) +
    `${aaaLight}/${aaaDark}`;

  console.log('  ' + row);
}

console.log('');

// ── Non-text table (WCAG 1.4.11, 3:1 floor) ─────────────────────

const nonTextHeader =
  'Pair (UI boundary)'.padEnd(COL_PAIR) +
  'Light'.padEnd(COL_RATIO) +
  'Dark'.padEnd(COL_RATIO) +
  '3:1 (L/D)';

console.log('  ' + nonTextHeader);
console.log('  ' + '─'.repeat(nonTextHeader.length));

for (const { label, lightRatio, darkRatio } of nonTextResults) {
  const ntLight = passNonText(lightRatio) ? '✓' : '✗';
  const ntDark = passNonText(darkRatio) ? '✓' : '✗';

  const row = label.padEnd(COL_PAIR) + fmt(lightRatio) + fmt(darkRatio) + `${ntLight}/${ntDark}`;

  console.log('  ' + row);
}

console.log('');

process.exit(failures.length > 0 || nonTextFailures.length > 0 ? 1 : 0);
