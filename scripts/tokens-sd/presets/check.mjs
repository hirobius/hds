/**
 * Shape validation for the framework presets (roadmap C2/C13). Runs without
 * @mui or tailwindcss installed — the presets are plain objects.
 *
 * Run: node scripts/tokens-sd/presets/check.mjs   (pnpm check:tokens-presets)
 */

import { hdsMuiThemeOptions } from './mui.mjs';
import { hdsTailwindPreset } from './tailwind.mjs';

const problems = [];
const isHex = (v) => typeof v === 'string' && /^#[0-9A-F]{6}$/i.test(v);
const isVar = (v) => typeof v === 'string' && v.startsWith('var(--');

// ── MUI preset: literals, valid palette ──────────────────────────────────────
const mui = hdsMuiThemeOptions();
const p = mui.palette;
for (const [k, v] of [
  ['primary.main', p.primary.main],
  ['primary.contrastText', p.primary.contrastText],
  ['error.main', p.error.main],
  ['background.default', p.background.default],
  ['text.primary', p.text.primary],
  ['divider', p.divider],
]) {
  if (!isHex(v)) problems.push(`MUI ${k} not a hex literal: ${v}`);
}
if (typeof mui.shape.borderRadius !== 'number' || !Number.isFinite(mui.shape.borderRadius))
  problems.push(`MUI shape.borderRadius not a number: ${mui.shape.borderRadius}`);
if (!mui.typography.fontFamily) problems.push('MUI typography.fontFamily missing');

// ── Tailwind preset: theme-aware var refs ────────────────────────────────────
const tw = hdsTailwindPreset().theme.extend;
const accent = tw.colors?.blue?.['500'];
const space4 = tw.spacing?.['4'];
const radiusAction = tw.borderRadius?.action ?? tw.borderRadius?.['8'];
if (!isVar(accent)) problems.push(`Tailwind colors.blue.500 not a var ref: ${accent}`);
if (!isVar(space4)) problems.push(`Tailwind spacing.4 not a var ref: ${space4}`);
if (radiusAction && !isVar(radiusAction)) problems.push(`Tailwind borderRadius not a var ref: ${radiusAction}`);
if (!tw.colors?.primary) problems.push('Tailwind role color "primary" missing');

console.log('=== Framework preset validation (C2 MUI / C13 Tailwind) ===');
console.log(`MUI palette.primary.main = ${p.primary.main}  (literal, color-math safe)`);
console.log(`MUI shape.borderRadius   = ${mui.shape.borderRadius}`);
console.log(`Tailwind colors.blue.500 = ${accent}  (var ref, theme-aware)`);
console.log(`Tailwind color keys: ${Object.keys(tw.colors).length}  spacing: ${Object.keys(tw.spacing).length}  radius: ${Object.keys(tw.borderRadius).length}`);

if (problems.length) {
  console.log(`\n✗ ${problems.length} problem(s):`);
  problems.forEach((x) => console.log(`    ${x}`));
  console.log('\nRESULT: FAIL');
  process.exit(1);
}
console.log('\nRESULT: PASS — both presets produce valid, correctly-typed output.');
