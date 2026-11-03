#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-source-canon.mjs
 *
 * Source-side companion to validators/swiss-canon.mjs. The JSX validator
 * runs on LLM-generated output; this scanner runs on hand-authored .tsx
 * files. They share rule definitions through validators/canon-rules.mjs so
 * a Swiss antipattern caught one way is caught the other.
 *
 * What it scans:
 *   src/app/components/**\/*.tsx
 *
 * src/app/pages and src/app/layouts no longer exist; SCAN_DIRS below is the
 * source of truth and fails loudly if a configured root goes missing.
 *
 * What it flags (rule code | meaning):
 *   FONT_BOLD         — `font-bold`/extra/black className OR `fontWeight: bold|700+`
 *   BG_WHITE_BLACK    — `bg-white`/`bg-black` className OR raw `#fff`/`#000`
 *   OVERSIZED_RADIUS  — `rounded-2xl|3xl|full` className on a structural element
 *   PURPLE_INDIGO     — `(text|bg|border|from|to|via|ring)-(purple|indigo|violet|fuchsia)-N`
 *   GRADIENT          — `bg-gradient-to-*` className
 *   LOREM             — lorem ipsum text content
 *   ELLIPSIS          — three-period `...` in JSX text content (use `…`)
 *   OFF_GRID_SPACING  — tailwind p-/m-/gap- utility outside the on-grid set
 *   DATA_TENANT       — `[data-tenant=...]` selector outside src/styles/tokens.generated.css
 *
 * Modes:
 *   default — exit 1 on any violation
 *   --soft  — print warnings and exit 0 (initial wiring; promote later)
 *
 * No AST: keep this fast and dependency-light. Regex scan over raw .tsx text
 * with className extraction. False positives are tolerated as long as they
 * are rare; we get one fixup pass before promoting to hard fail.
 */

import fs from 'fs';
import path from 'path';
import {
  LOREM_RE,
  TRIPLE_DOT_RE,
  FONT_BOLD_CLASS_RE,
  BG_BLACK_WHITE_CLASS_RE,
  OVERSIZED_RADIUS_CLASS_RE,
  PURPLE_CLASS_RE,
  GRADIENT_CLASS_RE,
  FONT_WEIGHT_BOLD_RE,
  RAW_HEX_BLACK_WHITE_RE,
  DATA_TENANT_SELECTOR_RE,
  INLINE_THIN_BAR_RE,
  INLINE_STRUCTURAL_BORDER_RE,
  tailwindSpacingViolation,
  extractClassNames,
  extractJsxText,
  fileNearStructural,
} from '../validators/canon-rules.mjs';
import { emitResult } from './lib/gate-output.mjs';
import { gateContext, gateFiles, lineOf, readBaselineSet } from './lib/source-scan.mjs';

// Fixture mode (--fixture-mode / HDS_FIXTURE_MODE=1 with FIXTURE_FILE) scans
// a single file (proof-of-firing harness). No-op in normal runs.
const ctx = gateContext(import.meta.url);
const { ROOT, jsonMode } = ctx;
const SOFT = process.argv.includes('--soft');
const VERBOSE = process.argv.includes('--verbose');

// A missing root throws (scanSources). Spec files are scanned too.
const SCAN_DIRS = ['src/app/components'];

// The sketches directory (formerly src/app/pages/sketches, removed with the
// docs SPA teardown, #51) was the "Expressive Zone" and explicitly suspended
// global HDS rules. Kept as a defensive skip in case generative-art code is
// reintroduced elsewhere under a sketches/ directory.
const SKIP_DIRS = ['sketches'];

// Known rule codes for per-rule bypass parsing.
const ALL_RULE_CODES = new Set([
  'FONT_BOLD',
  'BG_WHITE_BLACK',
  'OVERSIZED_RADIUS',
  'PURPLE_INDIGO',
  'GRADIENT',
  'LOREM',
  'ELLIPSIS',
  'OFF_GRID_SPACING',
  'DATA_TENANT',
  'INLINE_THIN_BAR',
  'INLINE_STRUCTURAL_BORDER',
]);

// Honor the project's existing per-file exemption conventions. If a file's
// header (first ~15 lines) carries either marker, skip the matching rules:
//
//   /* hds-bypass: CODE1, CODE2, ... */
//                            — skip only the listed rule codes (per-rule bypass).
//                              Use known codes from ALL_RULE_CODES.
//                              DEPRECATED: bare `hds-bypass: <prose>` (no code tokens)
//                              still skips all rules but emits a deprecation warning.
//   // font-ok: ...          — file intentionally uses bold/heavy weights
//                              (typography demos, snapshot pages); skip just
//                              FONT_BOLD for it.
//
// Returns: { skippedCodes: Set<string>, skipAll: boolean }
// skipAll is true only for legacy bare-prose bypasses (deprecated).
function fileExemptions(source, filePath) {
  const head = source.split('\n').slice(0, 15).join('\n');

  let skippedCodes = new Set();
  let skipAll = false;

  // Match: /* hds-bypass: <body> */  or  /* hds-bypass: <body>  (unclosed is fine)
  const bypassMatch = head.match(/\/\*\s*hds-bypass\s*:\s*([^*]*)/);
  if (bypassMatch) {
    const body = bypassMatch[1].trim();
    // Extract any tokens that look like rule codes (ALL_CAPS with underscores)
    const tokens = body
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const codes = tokens.filter((t) => ALL_RULE_CODES.has(t));

    if (codes.length > 0) {
      // Per-rule bypass: only skip the listed codes
      skippedCodes = new Set(codes);
    } else {
      // Legacy bare-prose bypass: skip all rules (deprecated)
      skipAll = true;
      const rel = filePath ? filePath : '<unknown>';
      process.stderr.write(
        `[check-source-canon] DEPRECATION: ${rel} uses bare hds-bypass without explicit rule codes.\n` +
          `  Update to: /* hds-bypass: CODE1, CODE2 */ using codes from: ${[...ALL_RULE_CODES].join(', ')}\n`,
      );
    }
  }

  // Legacy font-ok marker: still works as before
  if (/\/\/\s*font-ok\b/.test(head)) {
    skippedCodes.add('FONT_BOLD');
  }

  return { skippedCodes, skipAll };
}

// JSX text (see extractJsxText in canon-rules), minus captures on JSDoc/line
// comment lines, with the 1-based line of each capture.
function jsxTextLines(source) {
  const out = [];
  const lines = source.split('\n');
  function lineFor(idx) {
    let cumulative = 0;
    for (let i = 0; i < lines.length; i += 1) {
      cumulative += lines[i].length + 1;
      if (idx < cumulative) return { lineNum: i + 1, lineText: lines[i] };
    }
    return { lineNum: lines.length, lineText: '' };
  }
  for (const t of extractJsxText(source)) {
    const { lineNum, lineText } = lineFor(t.index);
    const trimmed = lineText.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
    out.push({ ...t, line: lineNum });
  }
  return out;
}

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  // POSIX separators always: `rel` is matched against hard-coded '/' paths
  // below (the `src/app/components/` prefix and the isPrimitive filename
  // regex). On Windows path.relative() returns backslashes, so those tests
  // silently fail and every primitive loses its exemption — card.tsx reported
  // INLINE_THIN_BAR on a clean tree, green on Linux CI and red locally.
  const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
  const exempt = fileExemptions(source, rel);
  if (exempt.skipAll) return violations;

  // Helper: should this rule code be skipped for this file?
  const skip = (code) => exempt.skippedCodes.has(code);

  // ── className-based rules ──
  for (const cn of extractClassNames(source)) {
    const line = lineOf(source, cn.index);
    if (!skip('FONT_BOLD') && FONT_BOLD_CLASS_RE.test(cn.value)) {
      violations.push({
        rel,
        line,
        code: 'FONT_BOLD',
        sample: cn.value,
        message: 'font-bold/extrabold/black className — use font-medium for emphasis, never bold',
      });
    }
    if (!skip('BG_WHITE_BLACK') && BG_BLACK_WHITE_CLASS_RE.test(cn.value)) {
      violations.push({
        rel,
        line,
        code: 'BG_WHITE_BLACK',
        sample: cn.value,
        message: 'bg-white/bg-black className — use semantic.color.surface tokens',
      });
    }
    if (
      !skip('OVERSIZED_RADIUS') &&
      OVERSIZED_RADIUS_CLASS_RE.test(cn.value) &&
      fileNearStructural(source)
    ) {
      violations.push({
        rel,
        line,
        code: 'OVERSIZED_RADIUS',
        sample: cn.value,
        message:
          'rounded-2xl/3xl/full on structural element — use radius.action (4) or radius.card (8)',
      });
    }
    if (!skip('PURPLE_INDIGO') && PURPLE_CLASS_RE.test(cn.value)) {
      violations.push({
        rel,
        line,
        code: 'PURPLE_INDIGO',
        sample: cn.value,
        message: 'purple/indigo/violet/fuchsia tailwind utility — palette is stone + Swiss Red',
      });
    }
    if (!skip('GRADIENT') && GRADIENT_CLASS_RE.test(cn.value)) {
      violations.push({
        rel,
        line,
        code: 'GRADIENT',
        sample: cn.value,
        message: 'bg-gradient-to-* — flat surfaces only',
      });
    }
    if (!skip('OFF_GRID_SPACING')) {
      const spacing = tailwindSpacingViolation(cn.value);
      if (spacing) {
        violations.push({
          rel,
          line,
          code: 'OFF_GRID_SPACING',
          sample: spacing.utility,
          message: `tailwind ${spacing.utility} is off the on-grid set`,
        });
      }
    }
  }

  // ── inline style + raw color rules ──
  let m;
  if (!skip('FONT_BOLD')) {
    const reFontWeight = new RegExp(FONT_WEIGHT_BOLD_RE.source, 'g');
    while ((m = reFontWeight.exec(source)) !== null) {
      violations.push({
        rel,
        line: lineOf(source, m.index),
        code: 'FONT_BOLD',
        sample: m[0],
        message: 'fontWeight bold/700+ in inline style — never bold',
      });
    }
  }
  if (!skip('BG_WHITE_BLACK')) {
    const reHex = new RegExp(RAW_HEX_BLACK_WHITE_RE.source, 'g');
    while ((m = reHex.exec(source)) !== null) {
      violations.push({
        rel,
        line: lineOf(source, m.index),
        code: 'BG_WHITE_BLACK',
        sample: m[0],
        message: 'raw #fff or #000 — use semantic.color tokens',
      });
    }
  }

  // ── JSX text content rules ──
  for (const t of jsxTextLines(source)) {
    if (!skip('LOREM') && LOREM_RE.test(t.value)) {
      violations.push({
        rel,
        line: t.line,
        code: 'LOREM',
        sample: t.value.slice(0, 60),
        message: 'lorem ipsum placeholder copy in JSX text',
      });
    }
    if (!skip('ELLIPSIS') && TRIPLE_DOT_RE.test(t.value)) {
      violations.push({
        rel,
        line: t.line,
        code: 'ELLIPSIS',
        sample: t.value.slice(0, 60),
        message: 'three-period "..." in JSX text — use "…"',
      });
    }
  }

  // ── Multi-tenant selector rule ──
  // [data-tenant=...] selectors are only allowed in src/styles/tokens.generated.css.
  // Component-level CSS must use the token system, not tenant selectors.
  if (!skip('DATA_TENANT') && !rel.includes('src/styles/tokens.generated.css')) {
    const reTenant = new RegExp(DATA_TENANT_SELECTOR_RE.source, 'g');
    while ((m = reTenant.exec(source)) !== null) {
      violations.push({
        rel,
        line: lineOf(source, m.index),
        code: 'DATA_TENANT',
        sample: m[0],
        message:
          '[data-tenant=...] selector found — tenant overrides only permitted in src/styles/tokens.generated.css',
      });
    }
  }

  // ── Card anatomy: inline thin bar rule (12d-card-anatomy) ──
  // Detects `style={{ height: '1-8px', background: 'var(--…)' }}` patterns
  // that crowd adjacent prose. Use Card.Progress for state indicators or
  // separate Card.Body blocks for grouping. Component primitives (Card,
  // Badge, Surface) implement these patterns themselves and are exempt.
  const isPrimitive =
    rel.startsWith('src/app/components/') &&
    // Match kebab-case primitive filenames (post-5bc184ea rename).
    /\/(card|badge|surface|divider|tag|tabs?|toggle|switch|checkbox|radio|select|input|textarea|stepper-field|combobox|segmented-control|button|icon-button|disclosure|alert|callout|banner|popover|tooltip|modal|sheet|lightbox|menu-button|nav-group|nav-item|side-nav|anchor|link|inline-link|inline-code|code-block)\.tsx$/.test(
      rel,
    );
  if (!isPrimitive) {
    if (!skip('INLINE_THIN_BAR')) {
      const reBar = new RegExp(INLINE_THIN_BAR_RE.source, 'g');
      while ((m = reBar.exec(source)) !== null) {
        violations.push({
          rel,
          line: lineOf(source, m.index),
          code: 'INLINE_THIN_BAR',
          sample: m[0].slice(0, 80),
          message:
            'inline thin colored bar (height: 1-8px + background: var(--…)) — use <Card.Progress> for state, or section structure (separate Card.Body blocks) for grouping',
        });
      }
    }

    // ── Outline rule (12d-outline-rule, Adrian 2026-05-03) ──
    // Outlines are for interactive containers; display surfaces should not
    // have structural borders. Annotate `outline-ok: <reason>` per-line for
    // legitimate exceptions (interactive ghost slots, focus rings, etc.).
    if (!skip('INLINE_STRUCTURAL_BORDER')) {
      const reBorder = new RegExp(INLINE_STRUCTURAL_BORDER_RE.source, 'g');
      while ((m = reBorder.exec(source)) !== null) {
        const ln = lineOf(source, m.index);
        const lineText = source.split('\n')[ln - 1] ?? '';
        if (lineText.includes('outline-ok:')) continue;
        violations.push({
          rel,
          line: ln,
          code: 'INLINE_STRUCTURAL_BORDER',
          sample: m[0].slice(0, 80),
          message:
            'inline structural border on a non-interactive surface — outlines are reserved for interactive affordances. Use background contrast, side-rules, or whitespace instead. Annotate `outline-ok: <reason>` for intentional exceptions (interactive ghost slots, focus rings).',
        });
      }
    }
  }

  return violations;
}

// 12d-outline-rule: ratchet baseline for INLINE_STRUCTURAL_BORDER.
// Existing violations are frozen here; new violations fail the gate.
// Burn down by fixing the ref and removing its line. Generated via
// `node scripts/check-source-canon.mjs --update-baseline`.
function loadStructuralBorderBaseline() {
  return readBaselineSet(path.join(ROOT, '.source-canon-baseline.txt'));
}

function structuralBorderKey(v) {
  return `${v.code}:${v.rel}:${v.sample}`;
}

function main() {
  const allFiles = gateFiles(ctx, {
    gate: 'check-source-canon',
    roots: SCAN_DIRS,
    exts: ['.tsx'],
    skipDirs: SKIP_DIRS,
    includeSpecs: true,
  });

  const allViolations = [];
  for (const f of allFiles) {
    const v = scanFile(f);
    if (v.length > 0) allViolations.push(...v);
  }

  // 12d-outline-rule: --update-baseline writes the current INLINE_STRUCTURAL_BORDER
  // violations to .source-canon-baseline.txt. New violations not in the baseline
  // fail the gate; baselined ones are tracked for follow-on burndown.
  const isUpdateBaseline = process.argv.includes('--update-baseline');
  if (isUpdateBaseline) {
    const baselineable = allViolations.filter((v) => v.code === 'INLINE_STRUCTURAL_BORDER');
    const lines = [
      '# .source-canon-baseline.txt',
      '# Generated by `node scripts/check-source-canon.mjs --update-baseline`.',
      '# Format: <CODE>:<relative-path>:<sample>',
      '# Each line below is a known structural-border violation frozen at',
      '# baseline time. New violations not in this file fail the gate.',
      '# Burn down by fixing the inline border and removing its line.',
      '',
      ...[...new Set(baselineable.map(structuralBorderKey))].sort(),
    ];
    fs.writeFileSync(path.join(ROOT, '.source-canon-baseline.txt'), lines.join('\n') + '\n');
    console.log(`✓ wrote ${lines.length - 7} INLINE_STRUCTURAL_BORDER baseline entries`);
    process.exit(0);
  }

  // Partition: INLINE_STRUCTURAL_BORDER violations get baseline-filtered;
  // all other rules fail on first occurrence.
  const baseline = loadStructuralBorderBaseline();
  const baselined = [];
  const reportable = [];
  for (const v of allViolations) {
    if (v.code === 'INLINE_STRUCTURAL_BORDER' && baseline.has(structuralBorderKey(v))) {
      baselined.push(v);
    } else {
      reportable.push(v);
    }
  }

  if (jsonMode) {
    const canonical = [];
    for (const v of reportable) {
      canonical.push({
        file: v.rel,
        line: v.line,
        rule: v.code,
        severity: 'error',
        message: v.message,
        sample: v.sample,
      });
    }
    for (const v of baselined) {
      canonical.push({
        file: v.rel,
        line: v.line,
        rule: v.code,
        severity: 'baselined',
        message: v.message,
        sample: v.sample,
      });
    }
    emitResult(
      {
        violations: canonical,
        summary: {
          filesScanned: allFiles.length,
          reportable: reportable.length,
          baselined: baselined.length,
        },
        ok: reportable.length === 0,
      },
      true,
    );
    process.exit(reportable.length === 0 ? 0 : 1);
  }

  if (VERBOSE || reportable.length > 0) {
    console.log(`Scanned ${allFiles.length} .tsx files in ${SCAN_DIRS.join(', ')}.`);
  }

  if (reportable.length === 0) {
    const baselineNote =
      baseline.size > 0
        ? ` (${baselined.length} baselined INLINE_STRUCTURAL_BORDER — burn down via 12d-2-outline-page-burndown)`
        : '';
    console.log(`OK — no Swiss canon violations in source${baselineNote}`);
    process.exit(0);
  }

  const grouped = {};
  for (const v of reportable) {
    grouped[v.code] = (grouped[v.code] || 0) + 1;
  }

  const stream = SOFT ? console.warn : console.error;
  const label = SOFT ? '⚠ ' : '✗ ';
  for (const v of reportable) {
    stream(`${label}${v.rel}:${v.line}  [${v.code}]  ${v.message}\n    sample: ${v.sample}`);
  }
  stream(
    `\n${reportable.length} source-canon violation(s) — counts: ${Object.entries(grouped)
      .map(([k, n]) => `${k}=${n}`)
      .join(', ')}`,
  );
  if (baselined.length > 0) {
    stream(`(${baselined.length} INLINE_STRUCTURAL_BORDER baselined — not shown)`);
  }

  if (SOFT) {
    console.warn('\n(--soft mode: exiting 0. Drop --soft once existing violations are fixed.)');
    process.exit(0);
  }
  process.exit(1);
}

main();
