#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — Layout Discipline Checker
 *
 * ─── ACCEPTANCE CRITERIA ──────────────────────────────────────────────────────
 * PASS: Every inline `style={{…}}` in src/app/components that carries a layout
 *       prop (margin*, padding*, position, top/right/bottom/left/inset,
 *       gap/rowGap/columnGap, flexBasis) resolves that prop through a token
 *       reference (`hds.*`, `var(--…)`) or a non-literal expression — never a
 *       raw px string or bare number.
 * FAIL: Any layout prop inside an inline `style={{…}}` carries a raw px string
 *       or bare numeric literal (0 excluded — a reset value has no scale to
 *       tokenize).
 *
 * Rationale: `Box`'s `sx` engine (src/app/components/box.tsx) is the sanctioned
 * escape hatch for one-off layout — it forces spacing/position values through
 * the same 4px HDS scale that named primitives (Stack/Grid/Container) already
 * bake in. Raw inline `style={{ margin: '12px' }}` bypasses that scale
 * entirely and is invisible to check-hardcoded-spacing's DIMENSION_PROPS
 * carve-out (position/flexBasis) — this gate closes that gap and narrows the
 * fix message to "use Box sx or a named layout primitive" rather than
 * check-hardcoded-spacing's generic "use hds.space.*".
 *
 * ─── SELF-IMPROVEMENT LOG ────────────────────────────────────────────────────
 * v1: Initial — brace-balanced scan of `style={{…}}` blocks in
 *     src/app/components for raw layout values. Introduced with #98.
 *
 * What it catches:
 *   style={{ marginBottom: '12px' }}   → should be Box sx={{ mb: 'normal' }}
 *   style={{ gap: 24 }}                → should be Stack gap="normal" or sx
 *   style={{ top: 8, left: 8 }}        → should be Box sx={{ top: ..., left: ... }}
 *
 * What it ignores:
 *   Values already using hds.*, var(--…), or any non-literal expression
 *     (identifiers, ternaries, template literals, spreads — those aren't
 *     "raw" even when this gate can't prove they resolve to a token; AST-free
 *     regex scanning can't safely evaluate arbitrary expressions).
 *   Zero literals (`margin: 0`, `inset: 0`) — a reset has no scale to violate.
 *   *.test.ts(x) / *.spec.ts(x) — test fixtures, not shipped UI.
 *   Lines carrying `// layout-ok: <reason>` (same line or the line above).
 *
 * Exemption: add `// layout-ok: <reason>` on the same line (or the line
 * immediately above) to suppress a specific violation.
 *
 * Run: node scripts/check-layout-discipline.mjs
 * Or:  pnpm check:layout-discipline
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, basename, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src', 'app', 'components');
const jsonMode = hasJsonFlag(process.argv);

// Fixture mode: scan a single file (proof-of-firing harness). No-op in normal runs.
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// ── Layout properties this gate polices ───────────────────────────────────────
// Margin/padding family + position offsets + gap family + flexBasis. `position`
// itself is included for completeness (spec parity with the #98 ask) even
// though its value is always a keyword, never a raw px/number — it will never
// match VALUE_RE below, so including it is a no-op in practice.
const LAYOUT_PROPS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginBlock',
  'marginInline',
  'marginBlockStart',
  'marginBlockEnd',
  'marginInlineStart',
  'marginInlineEnd',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingBlock',
  'paddingInline',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInlineStart',
  'paddingInlineEnd',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'gap',
  'rowGap',
  'columnGap',
  'flexBasis',
]);

// ── File collector ─────────────────────────────────────────────────────────
function isSkippedFile(fullPath) {
  const base = basename(fullPath);
  return /\.(test|spec)\.tsx?$/.test(base);
}

function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      collectFiles(full, results);
    } else if (extname(entry) === '.tsx' || extname(entry) === '.ts') {
      if (isSkippedFile(full)) continue;
      results.push(full);
    }
  }
  return results;
}

// ── Detection regexes (applied within a balanced style={{…}} block only) ─────
// Matches: propName: '16px' or propName: "16px"
const PX_STRING = /(\w+)\s*:\s*['"](-?\d+(?:\.\d+)?)px['"]/g;
// Matches: propName: 16  (bare numeric literal, comma/brace/newline terminated)
const BARE_NUM = /(\w+)\s*:\s*(-?\d+(?:\.\d+)?)\s*(?=[,\n}])/g;

/**
 * Given file content, find every `style={{ … }}` block and return
 * { start, end, text } spans (indices into `content`), balanced on braces.
 * Intentionally brace-counting rather than a full JS parse — consistent with
 * the rest of the guardrail suite's regex-first approach. Does not account
 * for braces inside string/template literals inside the style block; none of
 * the layout props this gate cares about legitimately hold such values.
 */
function findStyleBlocks(content) {
  const blocks = [];
  const OPEN_RE = /style\s*=\s*\{\{/g;
  let m;
  while ((m = OPEN_RE.exec(content)) !== null) {
    // Position right after `style={{` — we're now inside the object literal
    // at depth 1 (the inner `{`); the outer JSX-expression `{` is depth 0.
    const objStart = m.index + m[0].length;
    let depth = 1; // depth of the object literal itself
    let i = objStart;
    for (; i < content.length; i++) {
      const ch = content[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    const objEnd = i; // index of the matching '}' that closes the object literal
    // Include the closing brace itself in `text` — BARE_NUM's lookahead needs a
    // terminator character to match the object's last property (there is no
    // trailing comma before `}`).
    blocks.push({ start: objStart, end: objEnd, text: content.slice(objStart, objEnd + 1) });
    OPEN_RE.lastIndex = objEnd;
  }
  return blocks;
}

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

function isTokenValue(fullLine) {
  return fullLine.includes('hds.') || fullLine.includes('var(--');
}

function isSuppressed(lines, lineIdx) {
  const same = lines[lineIdx] || '';
  const prev = lineIdx > 0 ? lines[lineIdx - 1] : '';
  return same.includes('layout-ok:') || prev.includes('layout-ok:');
}

// ── Scan ────────────────────────────────────────────────────────────────────
const violations = [];

const filesToScan = isFixtureMode && fixtureFile ? [resolve(fixtureFile)] : collectFiles(SRC);

for (const file of filesToScan) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (const block of findStyleBlocks(content)) {
    for (const RE of [PX_STRING, BARE_NUM]) {
      RE.lastIndex = 0;
      let m;
      while ((m = RE.exec(block.text)) !== null) {
        const [, prop, rawVal] = m;
        if (!LAYOUT_PROPS.has(prop)) continue;

        const num = parseFloat(rawVal);
        if (num === 0) continue; // reset value, no scale to tokenize

        const matchIndex = block.start + m.index;
        const lineIdx = lineNumberAt(content, matchIndex) - 1;
        const lineText = lines[lineIdx] || '';

        if (isTokenValue(lineText)) continue; // defense in depth; regexes shouldn't match token exprs anyway
        if (isSuppressed(lines, lineIdx)) continue;

        const unit = RE === PX_STRING ? 'px' : '';
        violations.push({
          file: rel,
          line: lineIdx + 1,
          prop,
          val: `${rawVal}${unit}`,
          raw: lineText.trim().slice(0, 100),
        });
      }
    }
  }
}

// De-duplicate (a value can theoretically be matched by both regexes on
// overlapping spans in pathological input — keep it defensive).
const seen = new Set();
const uniqueViolations = violations.filter((v) => {
  const key = `${v.file}:${v.line}:${v.prop}:${v.val}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// ── Report ────────────────────────────────────────────────────────────────────
if (jsonMode) {
  const canonical = uniqueViolations.map((v) => ({
    file: v.file,
    line: v.line,
    rule: 'layout-discipline',
    severity: 'error',
    message: `${v.prop}: ${v.val}`,
    prop: v.prop,
    value: v.val,
    sample: v.raw,
  }));
  emitResult(
    {
      violations: canonical,
      summary: { total: uniqueViolations.length },
      ok: uniqueViolations.length === 0,
    },
    true,
  );
  process.exit(uniqueViolations.length === 0 ? 0 : 1);
}

if (uniqueViolations.length === 0) {
  console.log('\n✓ Layout discipline check passed — no raw layout values in inline style={{…}}.\n');
  process.exit(0);
} else {
  console.log(`\n✗ ${uniqueViolations.length} layout discipline violation(s) found:\n`);
  uniqueViolations.forEach((v) => {
    console.log(`  ${v.file}:${v.line}  [${v.prop}: ${v.val}]`);
    console.log(`    ${v.raw}`);
    console.log(
      `    Fix: use Box sx={{ ${v.prop}: <token key> }} or a named layout primitive ` +
        `(Stack/Grid/Container), or add // layout-ok: <reason>\n`,
    );
  });
  console.log('Suppress with // layout-ok: <reason> on the same or preceding line.\n');
  process.exit(1);
}
