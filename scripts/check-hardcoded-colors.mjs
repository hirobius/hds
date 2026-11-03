#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-hardcoded-colors.mjs
 *
 * Catches hardcoded color values in non-CSS color contexts that bypass the
 * CSS custom property cascade and are invisible to check-inline-styles /
 * check-tier-bypass.
 *
 * Contexts checked:
 *   C1 — SVG fill= / stroke= JSX attributes with hardcoded color values
 *   C2 — Canvas 2D context color property assignments (fillStyle, strokeStyle,
 *         shadowColor) with hardcoded color string literals
 *
 * Color patterns detected:
 *   • Hex: #rgb, #rrggbb, #rrggbbaa
 *   • RGB/RGBA: rgb(...), rgba(...)
 *   • OKLCH: oklch(...)
 *   • HSL/HSLA: hsl(...), hsla(...)
 *   • Named colors (common set): red, blue, green, white, black, etc.
 *     (Only in canvas assignments — JSX named color attrs are too noisy.)
 *
 * Exempt values (SVG fill/stroke):
 *   none, currentColor, inherit, transparent, url(...), var(--...)
 *
 * Suppression:
 *   // color-ok: <reason>  on the same line or immediately preceding line
 *
 * File-level exemption:
 *   Add `// @sketchbook-canvas` anywhere in the first 10 lines of a file to
 *   exempt the entire file. Use this for canvas drawing code where procedural
 *   colors (particle hues, gradient stops, trail fades) are intrinsic to the
 *   visual — not mappable to design tokens. The surrounding UI chrome should
 *   live in LabExperimentShell (which is fully tokened and NOT annotated).
 *
 * SKIP_FILES:
 *   HdsWebGLTriangleLogo.tsx  — documented carve-out in STANDARDS.md Â§ 5
 *   generated-token-values.ts, generated-token-descriptions.ts,
 *   generated-tokens.ts    — display-value exports, not component styles
 *   *.test.ts, *.spec.ts   — test fixtures may intentionally use raw values
 *
 * SKIP_DIRS:
 *   node_modules, .git, dist, experiments, __tests__
 *
 * Run:  node scripts/check-hardcoded-colors.mjs
 * Via:  pnpm check:colors
 */

import { readFileSync } from 'fs';
import { basename } from 'path';
import { emitResult } from './lib/gate-output.mjs';
import { fileLines, gateContext, gateFiles, isCommentLine } from './lib/source-scan.mjs';

const ctx = gateContext(import.meta.url);
const { ROOT, jsonMode } = ctx;

// ── Exemptions ────────────────────────────────────────────────────────────────

const SKIP_DIRS = ['node_modules', '.git', 'dist', '__tests__'];

const SKIP_BASENAMES = new Set([
  'HdsWebGLTriangleLogo.tsx',
  'generated-tokens.ts',
  'generated-token-values.ts',
  'generated-token-descriptions.ts',
  'generated-token-vars.d.ts',
]);

/** Returns true if the file opts out via // @sketchbook-canvas in first 10 lines. */
function isSketchbookCanvas(fullPath) {
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const header = content.split('\n').slice(0, 10).join('\n');
    return header.includes('@sketchbook-canvas');
  } catch {
    return false;
  }
}

// ── Color patterns ────────────────────────────────────────────────────────────

// Matches hex, rgb/rgba, oklch, hsl/hsla color values
const COLOR_VALUE_RE =
  /(?:#[0-9a-fA-F]{3,8}|rgba?\s*\([^)]+\)|oklch\s*\([^)]+\)|hsla?\s*\([^)]+\))/;

// CSS-safe values that are allowed in SVG fill/stroke attributes
const SVG_EXEMPT_RE = /^(?:none|currentColor|inherit|transparent|url\s*\(|var\s*\(--)/i;

// Common named colors (caught only in canvas assignments to reduce false positives)
const NAMED_COLOR_RE =
  /^(?:red|blue|green|white|black|yellow|orange|purple|pink|gray|grey|cyan|magenta|brown|navy|teal|lime|silver|gold)\b/i;

// ── Suppression check ─────────────────────────────────────────────────────────

function isSuppressed(lines, lineIdx) {
  const same = lines[lineIdx] || '';
  const prev = lineIdx > 0 ? lines[lineIdx - 1] : '';
  return same.includes('// color-ok:') || prev.includes('// color-ok:');
}

// One line-by-line regex scan shared by C1 and C2: every match whose captured
// value `isHardcoded` and is not suppressed becomes a violation.
function scanAssignments(lines, rel, violations, { re, check, isHardcoded, detail, fix }) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment lines
    if (isCommentLine(line)) continue;

    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const val = (m[1] || m[2] || m[3] || '').trim();
      if (!val) continue;
      if (!isHardcoded(val)) continue;
      if (isSuppressed(lines, i)) continue;
      violations.push({ check, file: rel, line: i + 1, detail: detail(val), fix });
    }
  }
}

// ── C1 — SVG fill= / stroke= with hardcoded color ────────────────────────────
//
// Matches JSX attribute patterns:
//   fill="#hex"        fill={'#hex'}
//   stroke="#hex"      strokeColor={...}
//
// Also catches fill={expr} where the string literal inside contains a color.

const SVG_RULE = {
  re: /\b(?:fill|stroke)(?:Color)?\s*=\s*(?:"([^"]+)"|'([^']+)'|\{['"]([^'"]+)['"]\})/g,
  check: 'C1',
  isHardcoded: (val) => !SVG_EXEMPT_RE.test(val) && COLOR_VALUE_RE.test(val),
  detail: (val) => `SVG fill/stroke attribute has hardcoded color: "${val}"`,
  fix: `Use getComputedStyle(el).getPropertyValue('--semantic-color-...') or color-ok: <reason>`,
};

// ── C2 — Canvas context color property assignments ────────────────────────────
//
// Matches:
//   ctx.fillStyle   = '#hex'
//   ctx.strokeStyle = 'oklch(...)'
//   context.shadowColor = 'rgb(...)'

const CANVAS_RULE = {
  re: /\.(?:fillStyle|strokeStyle|shadowColor)\s*=\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g,
  check: 'C2',
  // Exempt CSS vars passed to canvas (valid pattern via getComputedStyle result)
  isHardcoded: (val) =>
    !val.startsWith('var(--') && (COLOR_VALUE_RE.test(val) || NAMED_COLOR_RE.test(val)),
  detail: (val) => `Canvas context color assignment has hardcoded value: "${val}"`,
  fix: `Read via getComputedStyle(el).getPropertyValue('--semantic-color-...') at render time`,
};

// ── Main ──────────────────────────────────────────────────────────────────────

const files = gateFiles(ctx, {
  gate: 'check-hardcoded-colors',
  roots: ['src'],
  exts: ['.ts', '.tsx'],
  skipDirs: SKIP_DIRS,
  keep: (file) => !SKIP_BASENAMES.has(basename(file)) && !isSketchbookCanvas(file),
});
const violations = [];

for (const file of files) {
  const { rel, lines } = fileLines(ROOT, file);
  scanAssignments(lines, rel, violations, SVG_RULE);
  scanAssignments(lines, rel, violations, CANVAS_RULE);
}

if (jsonMode) {
  const canonicalViolations = violations.map((v) => ({
    file: v.file,
    line: v.line,
    rule: v.check === 'C1' ? 'hardcoded-color-svg' : 'hardcoded-color-canvas',
    severity: 'error',
    message: v.detail,
    fix: v.fix,
  }));
  emitResult(
    {
      violations: canonicalViolations,
      summary: { total: violations.length, filesScanned: files.length },
      ok: violations.length === 0,
    },
    true,
  );
  process.exit(violations.length === 0 ? 0 : 1);
}

if (violations.length === 0) {
  console.log('[ok] check-hardcoded-colors — no hardcoded colors in non-CSS contexts');
  process.exit(0);
} else {
  console.error(`\nâœ— check-hardcoded-colors — ${violations.length} violation(s)\n`);
  for (const v of violations) {
    console.error(`  [${v.check}] ${v.file}:${v.line}`);
    console.error(`    ${v.detail}`);
    console.error(`    Fix: ${v.fix}\n`);
  }
  console.error('Suppress with // color-ok: <reason> on the same or preceding line.\n');
  process.exit(1);
}
