#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-motion.mjs
 *
 * Verifies that interactive components ship with motion feedback — the HDS
 * standard that every user action has a visible, token-timed response.
 *
 * ACCEPTANCE CRITERIA
 * ───────────────────
 * Any .tsx file in src/app/components/ that contains interactive elements
 * (<button, <input, <select, <a, or onClick handlers) must satisfy at least
 * ONE of the following:
 *
 *   A) Imports from "motion/react" and uses motion.* or AnimatePresence
 *   B) Uses a CSS transition referencing an hds.duration.* token, a
 *      --primitive/--semantic-duration-* var, or a Tailwind `transition-` or
 *      `animate-` utility (the form 0.13.0's Tailwind + cva migration produces)
 *   C) Is annotated with // motion-ok: <reason> to document intentional exemption
 *
 * WHAT THIS CATCHES
 * ─────────────────
 *   - Buttons with no hover/press feedback
 *   - Dropdowns that appear instantly with no entrance animation
 *   - Interactive controls missing transition on state changes
 *
 * WHAT IT DOES NOT CATCH
 * ──────────────────────
 *   - Static/display components (no interaction = no motion required)
 *   - Canvas-based animations (handled by requestAnimationFrame, not motion/react)
 *   - CSS-only components using transition: without hds.duration (use motion-ok)
 *
 * DESIGN INSPIRATION
 * ──────────────────
 *   Apple HIG    — every tap and state change has a physical, timed response
 *   Material You — motion is a communication tool, not decoration
 *   Framer       — 60fps feedback is the baseline expectation in modern UI
 *
 * "Motion communicates that the system is alive and responding. A UI with
 *  no motion is a UI that feels broken." — HDS Motion Principle #1
 *
 * SELF-IMPROVEMENT LOG
 * ────────────────────
 * v1 (2026-03-16): Initial check — interactive components need motion/react import
 *                  OR hds.duration transition reference OR // motion-ok exemption.
 * v2 (2026-09-21): Recognise Tailwind `transition-` and `animate-` utilities and raw
 *                  duration CSS vars. Tag animates via `transition-colors` on its
 *                  cva variants and was still reported as having no motion, because
 *                  the pattern list had not followed the components off inline
 *                  styles. Also stops scanning generated *.figma.ts Code Connect
 *                  templates, which carry a component's props but render nothing.
 *
 * v3 (2026-10-27, hds#784): Comments are blanked before the motion patterns
 *                  run, so prose naming "transition" no longer passes a file.
 *                  `// motion-ok:` must be its own line comment with a reason.
 *                  Arbitrary Tailwind motion values without a var(--…) token
 *                  (animate-[spin_1s_linear], [transition:all_150ms]) now fail.
 *
 * Usage: pnpm check:micromotion
 * Exempt: a `// motion-ok: <reason>` line comment anywhere in the file
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, resolve } from 'path';
import { isSpecFile } from './lib/gate-scope.mjs';
import { gateContext } from './lib/source-scan.mjs';

const { ROOT, isFixtureMode, fixtureFile } = gateContext(import.meta.url);
const COMP_DIR = join(ROOT, 'src/app/components');
const failures = [];

// ── Files where motion is structurally N/A ────────────────────────────────────
// These are utility files, type definitions, or display-only components.
// When adding here, document WHY motion is not applicable.
const SKIP = new Set([
  'types.ts', // type definitions — no JSX
  'HdsWebGLTriangleLogo.tsx', // canvas animation — RAF loop, not motion/react
  'ImageFill.tsx', // pure image wrapper — display only
  'AssetImg.tsx', // pure image wrapper — display only
  'BulgeCard.tsx', // SVG canvas animation — RAF loop, motion-ok pattern
]);

// ── What makes a file "interactive" ──────────────────────────────────────────
const INTERACTIVE_PATTERNS = [
  /\bonClick\b/,
  /\bonMouseEnter\b/,
  /\bonMouseLeave\b/,
  /\bonChange\b/,
  /<button/,
  /<input/,
  /<select/,
  /<a\s/,
  /role="button"/,
  /role="link"/,
];

// ── What satisfies the motion requirement ─────────────────────────────────────
// The last three exist because 0.13.0 migrated components off inline style
// objects onto Tailwind + cva. Tag came out of that migration with
// `transition-colors` on both its cva variants — real motion feedback, on
// screen — but this list only knew `hds.duration.*`, so the gate reported a
// component that animates as having none. The rule did not change; the
// vocabulary it is written in did.
const MOTION_PATTERNS = [
  /from ['"]motion\/react['"]/, // imports motion/react
  /motion\.[a-z]/, // uses motion.div / motion.button / etc.
  /AnimatePresence/, // uses AnimatePresence
  /whileHover|whileTap|whileFocus/, // uses motion gesture props
  /hds\.duration\./, // CSS transition references duration token
  /hds\.easing\./, // references easing token in transition
  // Tailwind transition utilities, matched as class tokens (quote- or
  // space-delimited) so the word "transition" in prose does not count.
  /["'\s]transition(?:-(?:all|colors|opacity|transform|shadow))?["'\s]/,
  /["'\s]animate-[a-z]/, // Tailwind animation utilities
  /var\(--(?:primitive|semantic)-duration-/, // duration token as a raw CSS var
];

// ── Per-file exemption ────────────────────────────────────────────────────────
// A line comment of its own with a reason (hds#784). Matching the text anywhere
// let a string literal, or a bare `// motion-ok:` with no reason, exempt a file.
const EXEMPT_PATTERN = /^[ \t]*\/\/[ \t]*motion-ok:[ \t]*\S/m;

// ── Hard-coded arbitrary motion values (hds#784) ──────────────────────────────
// `animate-[spin_1s_linear]`, `[transition:all_150ms]`, `duration-[150ms]` and
// `ease-[...]` set timing without a token, and matched none of the patterns
// above, so they passed unseen. Built on a var(--…) token they are fine.
const ARBITRARY_MOTION =
  /(?<![\w-])(?:(?:animate|duration|ease|delay)-\[[^\]\s]+\]|\[(?:transition|animation)(?:-[a-z-]+)?:[^\]\s]+\])/g;

/**
 * Source with comments blanked, so prose cannot satisfy a code pattern. One
 * pass that skips string literals, so `'a//b'` or a `/*` inside a line comment
 * cannot swallow real code.
 */
const COMMENT_OR_STRING =
  /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
const stripComments = (src) => src.replace(COMMENT_OR_STRING, (m, str) => str ?? ' ');

const MISSING_MOTION =
  'Interactive component has no motion feedback.\n' +
  '       Fix one of:\n' +
  '         A) Import from "motion/react" and wrap elements with motion.* or AnimatePresence\n' +
  '         B) Add CSS transition referencing hds.duration.* on state-changing elements\n' +
  '         C) Add // motion-ok: <reason> to document why motion is intentionally absent\n' +
  '\n' +
  '       Example: transition: `background-color ${hds.duration.fast}s ease`\n' +
  '       Example: import { motion } from "motion/react"; → <motion.div whileHover={{ ... }}>';

/** Problems in one component file's source; empty when it passes. */
function problemsIn(content) {
  if (EXEMPT_PATTERN.test(content)) return [];
  const code = stripComments(content);
  const problems = [];
  const hardCoded = [...code.matchAll(ARBITRARY_MOTION)]
    .map((m) => m[0])
    .filter((v) => !v.includes('var(--'));
  if (hardCoded.length) {
    problems.push(
      `Hard-coded motion value: ${[...new Set(hardCoded)].join(', ')}.\n` +
        '       Use a token, e.g. duration-[var(--primitive-duration-fast)], or a named utility.',
    );
  }
  const isInteractive = INTERACTIVE_PATTERNS.some((p) => p.test(code));
  if (isInteractive && !MOTION_PATTERNS.some((p) => p.test(code))) problems.push(MISSING_MOTION);
  return problems;
}

function checkFile(full, content) {
  const file = full.replace(ROOT + '/', '');
  for (const msg of problemsIn(content)) failures.push({ file, msg });
}

// ── Scan ──────────────────────────────────────────────────────────────────────

function scanDir(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
      continue;
    }
    if (extname(entry) !== '.tsx' && extname(entry) !== '.ts') continue;
    // Test/spec files are not components — their JSX may reference interactive
    // props (onChange/onClick) for assertions without being a real surface.
    if (isSpecFile(entry)) continue;
    // Nor are generated Code Connect templates. checkbox.figma.ts and
    // radio.figma.ts describe how a component maps into Figma; they carry the
    // component's props (so they read as interactive) but render nothing, so
    // "this interactive component has no motion feedback" has no subject.
    // They are generated by scripts/generate-code-connect.mjs — adding motion
    // to one would be overwritten on the next run.
    if (entry.endsWith('.figma.ts')) continue;
    if (SKIP.has(entry)) continue;

    checkFile(full, readFileSync(full, 'utf-8'));
  }
}

if (isFixtureMode && fixtureFile) {
  // Scan only the single fixture file
  const absPath = resolve(fixtureFile);
  const entry = absPath.split('/').pop() ?? '';
  if (!SKIP.has(entry) && (absPath.endsWith('.tsx') || absPath.endsWith('.ts'))) {
    checkFile(absPath, readFileSync(absPath, 'utf-8'));
  }
} else {
  scanDir(COMP_DIR);
}

// ── Report ────────────────────────────────────────────────────────────────────

if (failures.length === 0) {
  console.log('\nâœ“ Motion check passed — all interactive components have motion feedback.\n');
  process.exit(0);
} else {
  console.error(
    `\nâœ— Motion check failed — ${failures.length} component(s) have no motion feedback or hard-code it.\n`,
  );
  console.error('  Hard-coded arbitrary motion values must use a token.');
  console.error('  Every interactive component needs at least one of:\n');
  console.error('    A) motion/react (motion.div, AnimatePresence, whileHover, etc.)');
  console.error('    B) CSS transition referencing hds.duration.* tokens');
  console.error('    C) // motion-ok: <reason> annotation documenting intentional absence\n');
  console.error('  Motion is communication. A UI with no feedback feels broken.\n');

  for (const { file, msg } of failures) {
    console.error(`  ${file}`);
    console.error(`    âœ—  ${msg}\n`);
  }

  process.exit(1);
}
