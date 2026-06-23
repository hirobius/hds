#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-css-integrity.mjs
 *
 * Verifies that hand-authored bridge vars in theme.css stay in sync with
 * the token source of truth in hirobius.tokens.json.
 *
 * Checks:
 *   I1-I10  - legacy --hds-accent* / --hds-color-brand helpers alias semantic token vars
 *   I11     - --hds-color-brand-rgb matches RGB components of primitive.color.blue.500
 *   I12     - --hds-font-family includes primitive.typography.family.primary[0]
 *   I13     - --hds-font-mono includes primitive.typography.family.mono[0] (if var exists)
 *
 * Run: node scripts/check-css-integrity.mjs
 * Or via: pnpm check:css
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** sRGB 0-255 components from a hex or oklch(L C H) color. */
function colorToRGB(color) {
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
    return {
      r: parseInt(color.slice(1, 3), 16),
      g: parseInt(color.slice(3, 5), 16),
      b: parseInt(color.slice(5, 7), 16),
    };
  }
  const m = /^oklch\(\s*([^)]+)\)/i.exec(color || '');
  if (!m) return null;
  const [L, C, H] = m[1].split(/\s+/).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)));
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const enc = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const ch = (lin) => Math.round(clamp(enc(clamp(lin))) * 255);
  return {
    r: ch(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: ch(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: ch(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  };
}

/** Extract the value of a CSS custom property from the first :root block. */
function extractRootVar(css, varName) {
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  if (!rootMatch) return null;
  const block = rootMatch[1];
  const re = new RegExp(`${varName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\s*:\\s*([^;]+);`);
  const match = block.match(re);
  return match ? match[1].trim() : null;
}

const raw = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));
const css = readFileSync(join(ROOT, 'src', 'styles', 'theme.css'), 'utf8');

const errors = [];

const bridgeChecks = [
  ['I1', '--hds-accent', 'var(--semantic-accent-rest)'],
  ['I2', '--hds-accent-hover', 'var(--semantic-accent-hover)'],
  ['I3', '--hds-accent-pressed', 'var(--semantic-accent-pressed)'],
  ['I4', '--hds-accent-inactive', 'var(--semantic-accent-inactive)'],
  ['I5', '--hds-accent-disabled', 'var(--semantic-accent-disabled)'],
  ['I6', '--hds-accent-content', 'var(--semantic-accent-content)'],
  ['I7', '--hds-accent-content-hover', 'var(--semantic-accent-contentHover)'],
  ['I8', '--hds-accent-subtle', 'var(--semantic-accent-subtle)'],
  ['I9', '--hds-color-brand', 'var(--semantic-accent-rest)'],
  ['I10', '--hds-color-brand-pressed', 'var(--semantic-accent-pressed)'],
];

for (const [id, helper, expected] of bridgeChecks) {
  const actual = extractRootVar(css, helper);
  if (actual === null) {
    errors.push(`${id} ${helper}: theme.css is missing the helper bridge`);
    continue;
  }
  if (actual !== expected) {
    errors.push(`${id} ${helper}: theme.css has "${actual}", expected "${expected}"`);
  }
}

const brandHex = raw.primitive?.color?.blue?.['500']?.['$value'];
if (brandHex) {
  const rgb = colorToRGB(brandHex);
  if (rgb) {
    const expectedRGB = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    const actualRGB = extractRootVar(css, '--hds-color-brand-rgb');
    if (actualRGB !== null) {
      const normalized = actualRGB.replace(/\s+/g, ' ').trim();
      if (normalized !== expectedRGB) {
        errors.push(`I11 --hds-color-brand-rgb: theme.css has "${normalized}", token expects "${expectedRGB}" (from ${brandHex})`);
      }
    }
  } else {
    errors.push(`I11 primitive.color.blue.500 value "${brandHex}" is not a hex or oklch color`);
  }
} else {
  errors.push('I11 primitive.color.blue.500 not found in hirobius.tokens.json');
}

const primaryFontArr = raw.primitive?.typography?.family?.primary?.['$value'];
if (Array.isArray(primaryFontArr) && primaryFontArr.length > 0) {
  const firstFont = primaryFontArr[0];
  const actualFam = extractRootVar(css, '--hds-font-family');
  if (actualFam !== null && !actualFam.includes(firstFont)) {
    errors.push(`I12 --hds-font-family: theme.css does not lead with "${firstFont}" (primary font from token)`);
  }
} else {
  errors.push('I12 primitive.typography.family.primary not found or not an array in hirobius.tokens.json');
}

const monoFontArr = raw.primitive?.typography?.family?.mono?.['$value'];
if (Array.isArray(monoFontArr) && monoFontArr.length > 0) {
  const firstMono = monoFontArr[0];
  const actualMono = extractRootVar(css, '--hds-font-mono');
  if (actualMono !== null && !actualMono.includes(firstMono)) {
    errors.push(`I13 --hds-font-mono: theme.css does not include "${firstMono}" (mono font from token)`);
  }
}

if (errors.length > 0) {
  console.error('\nCSS integrity check failed:\n');
  errors.forEach((error) => console.error(`  ${error}`));
  console.error('\nFix the drift between theme.css and hirobius.tokens.json.\n');
  process.exit(1);
} else {
  console.log('[ok] CSS integrity - theme.css bridge vars match token values');
}
