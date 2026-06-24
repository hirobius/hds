/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-prop-vocabulary.mjs
 *
 * Enforces a consistent prop-VALUE vocabulary across HDS component primitives,
 * so the same concept is named the same way everywhere (the drift the
 * 2026-06 prop-API audit surfaced: Alert spelled the destructive red 'error'
 * while Badge/Card/Callout said 'danger'; SegmentedControl sized itself
 * 'default'/'compact' off the shared sm/md/lg ramp).
 *
 * Rules (high-signal, low-false-positive — extend deliberately):
 *
 *   A. Feedback red is 'danger', never 'error'.
 *      Fires when a `tone`/`variant` prop declaration, or a `*Tone`/`*Variant`
 *      type alias, contains the literal value 'error'. Use 'danger'.
 *
 *   B. Control size stays on the sm/md/lg ramp.
 *      Fires when a `size` prop declaration, or a `*Size` type alias, contains
 *      the vague values 'default' or 'compact'. Use sm | md | lg.
 *
 * Deliberately OUT of scope (not a tone/variant/size axis):
 *   - Domain status enums like `ActivityStatus = ... | 'error' | ...` — a status
 *     vocabulary, not a tone prop. Align separately if desired; this gate does
 *     not force it.
 *
 * Scope: top-level files in src/app/components/ (the primitive tier).
 * Exempt: add `// vocab-ok: <reason>` anywhere in the file.
 *
 * Usage: node scripts/check-prop-vocabulary.mjs
 * Exit codes: 0 = clean, 1 = violations.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, basename } from 'path';

const ROOT = process.cwd();
const COMPONENTS_DIR = join(ROOT, 'src/app/components');

// Fixture mode: scan a single file (proof-of-firing harness). No-op in normal runs.
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// ── Rules ───────────────────────────────────────────────────────────────────
// A tone/variant prop declaration or *Tone/*Variant type alias, capturing the
// type RHS up to a line break or terminator (covers the common single-line union).
const TONE_DECL_RE =
  /\b(?:(?:tone|variant)\s*\??\s*:|type\s+\w*(?:Tone|Variant)\s*=)\s*([^;{}\n]+)/g;
// A size prop declaration or *Size type alias.
const SIZE_DECL_RE = /\b(?:size\s*\??\s*:|type\s+\w*Size\s*=)\s*([^;{}\n]+)/g;

const BANNED_TONE_VALUE = "'error'";
const BANNED_SIZE_VALUES = ["'default'", "'compact'"];

function findViolations(content) {
  const out = [];
  for (const m of content.matchAll(TONE_DECL_RE)) {
    if (m[1].includes(BANNED_TONE_VALUE)) {
      out.push({
        rule: 'A',
        detail: `tone/variant value 'error' — use 'danger' (feedback red is 'danger' everywhere)`,
      });
    }
  }
  for (const m of content.matchAll(SIZE_DECL_RE)) {
    const bad = BANNED_SIZE_VALUES.filter((v) => m[1].includes(v));
    if (bad.length) {
      out.push({
        rule: 'B',
        detail: `size value ${bad.join(' / ')} — use the sm | md | lg ramp`,
      });
    }
  }
  return out;
}

// ── Scanner ───────────────────────────────────────────────────────────────────

const entries =
  isFixtureMode && fixtureFile
    ? [resolve(fixtureFile)]
    : readdirSync(COMPONENTS_DIR).map((e) => join(COMPONENTS_DIR, e));

const violations = [];

for (const full of entries) {
  const entry = basename(full);
  if (!entry.endsWith('.tsx') && !entry.endsWith('.ts')) continue;
  const stat = statSync(full);
  if (!stat.isFile()) continue;

  const content = readFileSync(full, 'utf-8');
  if (content.includes('// vocab-ok')) continue;

  for (const v of findViolations(content)) {
    violations.push({ file: relative(ROOT, full).replace(/\\/g, '/'), ...v });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log('✓ check-prop-vocabulary — tone/variant and size prop values are consistent.');
  process.exit(0);
}

console.error(`✗ check-prop-vocabulary — ${violations.length} vocabulary violation(s):`);
console.error('');
for (const { file, detail } of violations) {
  console.error(`  ${file}`);
  console.error(`    ${detail}`);
  console.error('');
}
console.error('  Fix:    align the value to the HDS vocabulary (danger / sm|md|lg).');
console.error('  Exempt: add // vocab-ok: <reason> if a deviation is genuinely intentional.');
process.exit(1);
