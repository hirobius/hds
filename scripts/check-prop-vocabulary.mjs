/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-prop-vocabulary.mjs
 *
 * Enforces a consistent prop-VALUE vocabulary across HDS component primitives,
 * so the same concept is named the same way everywhere (the drift the
 * 2026-06 prop-API audit surfaced: Alert spelled the destructive red 'error'
 * while Badge/Card/Callout said 'danger'; SegmentedControl sized itself
 * 'default'/'compact' off the shared sm/md/lg ramp). Extended for #60 (variant
 * contract) with rules C/D policing the `tone`/`density` axes against the
 * fixed vocabularies documented in docs/architecture/variant-contract.md.
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
 *   C. `tone` is drawn from the fixed feedback set.
 *      Fires when a `tone` prop declaration, or a `*Tone` type alias, contains
 *      a literal outside neutral | danger | success | warning | info.
 *
 *   D. `density` is drawn from the fixed set.
 *      Fires when a `density` prop declaration, or a `*Density` type alias,
 *      contains a literal outside comfortable | compact.
 *
 * Detection mechanics (shared by all four rules): a single-line regex capture
 * of the declaration's RHS, up to the next `;`, `{`, `}`, or newline. This
 * reliably catches flat type aliases (`type XTone = 'a' | 'b';`) and inline
 * prop unions (`tone?: 'a' | 'b';`) — the dominant pre-cva-rollout shape — but
 * does NOT reach into a multi-line `cva({ variants: { tone: {...} } })` block,
 * since each variant key sits on its own line with no `tone` token on it.
 * That's an accepted gap for cva-converted components: their tone vocabulary
 * is already load-bearing through `VariantProps` type inference, so the
 * regex's job here is catching drift in the *other* components still mid-rollout.
 *
 * Deliberately OUT of scope (not a tone/variant/size/density axis):
 *   - Domain status enums like `ActivityStatus = ... | 'error' | ...` — a status
 *     vocabulary, not a tone prop. Align separately if desired; this gate does
 *     not force it.
 *   - Pre-existing `tone` props that predate this gate and name a different
 *     concept than feedback intent (e.g. a dev-tool control panel's
 *     'primary'/'secondary' tone, or a badge-style 'beta' marker) — exempted
 *     file-by-file with `// vocab-ok:` rather than force-renamed outside their
 *     own conversion batch.
 *
 * Scope: top-level files in src/app/components/ (the primitive tier).
 * Exempt: add `// vocab-ok: <reason>` anywhere in the file.
 *
 * Usage: node scripts/check-prop-vocabulary.mjs
 *        node scripts/check-prop-vocabulary.mjs --coverage   (informational; always exit 0)
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
const isCoverageMode = process.argv.includes('--coverage');

// ── Rules ───────────────────────────────────────────────────────────────────
// A tone/variant prop declaration or *Tone/*Variant type alias, capturing the
// type RHS up to a line break or terminator (covers the common single-line union).
const TONE_OR_VARIANT_DECL_RE =
  /\b(?:(?:tone|variant)\s*\??\s*:|type\s+\w*(?:Tone|Variant)\s*=)\s*([^;{}\n]+)/g;
// A size prop declaration or *Size type alias.
const SIZE_DECL_RE = /\b(?:size\s*\??\s*:|type\s+\w*Size\s*=)\s*([^;{}\n]+)/g;
// A tone-only prop declaration or *Tone type alias (rule C — narrower than the
// combined tone|variant regex above, since the fixed vocabulary only applies
// to `tone`, not to component-specific `variant` naming).
const TONE_ONLY_DECL_RE = /\b(?:tone\s*\??\s*:|type\s+\w*Tone\s*=)\s*([^;{}\n]+)/g;
// A density prop declaration or *Density type alias.
const DENSITY_DECL_RE = /\b(?:density\s*\??\s*:|type\s+\w*Density\s*=)\s*([^;{}\n]+)/g;

const BANNED_TONE_VALUE = "'error'";
const BANNED_SIZE_VALUES = ["'default'", "'compact'"];
const ALLOWED_TONE_VALUES = ['neutral', 'danger', 'success', 'warning', 'info'];
const ALLOWED_DENSITY_VALUES = ['comfortable', 'compact'];

/**
 * Extract the string-literal value(s) a captured declaration RHS constrains
 * to. A union type (contains ` | `) is a real vocabulary — every literal in
 * it is checked. A single-value assignment (e.g. `tone: 'neutral', size: 'md'`
 * captured on one line inside an object literal) is NOT a union — only the
 * first literal belongs to this prop; anything after the first comma belongs
 * to a sibling key on the same line, so it's ignored to avoid false positives.
 */
function extractLiterals(captured) {
  if (captured.includes('|')) {
    return [...captured.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }
  const first = captured.match(/'([^']+)'/);
  return first ? [first[1]] : [];
}

function findViolations(content) {
  const out = [];
  for (const m of content.matchAll(TONE_OR_VARIANT_DECL_RE)) {
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
  for (const m of content.matchAll(TONE_ONLY_DECL_RE)) {
    const bad = extractLiterals(m[1]).filter((v) => !ALLOWED_TONE_VALUES.includes(v));
    if (bad.length) {
      out.push({
        rule: 'C',
        detail: `tone value(s) ${bad.map((v) => `'${v}'`).join(' / ')} — use neutral | danger | success | warning | info`,
      });
    }
  }
  for (const m of content.matchAll(DENSITY_DECL_RE)) {
    const bad = extractLiterals(m[1]).filter((v) => !ALLOWED_DENSITY_VALUES.includes(v));
    if (bad.length) {
      out.push({
        rule: 'D',
        detail: `density value(s) ${bad.map((v) => `'${v}'`).join(' / ')} — use comfortable | compact`,
      });
    }
  }
  return out;
}

// ── Coverage (informational rollout tracker; never fails) ────────────────────
// Counts src/app/components/*.tsx primitives (excluding .test.tsx/.figma.tsx
// harness files, which aren't components) that have adopted the cva variant
// contract vs. the total. Standalone: does not run the rule checks above, and
// always exits 0 — this is a progress readout for the #60 rollout, not a gate.
if (isCoverageMode) {
  const componentFiles = readdirSync(COMPONENTS_DIR).filter(
    (e) => e.endsWith('.tsx') && !e.endsWith('.test.tsx') && !e.endsWith('.figma.tsx'),
  );
  let onCva = 0;
  for (const entry of componentFiles) {
    const content = readFileSync(join(COMPONENTS_DIR, entry), 'utf-8');
    if (content.includes('cva(')) onCva++;
  }
  const total = componentFiles.length;
  console.log(
    `[check-prop-vocabulary --coverage] ${onCva} of ${total} src/app/components/*.tsx primitives use cva( (${((onCva / total) * 100).toFixed(1)}%).`,
  );
  process.exit(0);
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
  console.log(
    '✓ check-prop-vocabulary — tone/variant, size, and density prop values are consistent.',
  );
  process.exit(0);
}

console.error(`✗ check-prop-vocabulary — ${violations.length} vocabulary violation(s):`);
console.error('');
for (const { file, rule, detail } of violations) {
  console.error(`  ${file}`);
  console.error(`    [${rule}] ${detail}`);
  console.error('');
}
console.error(
  '  Fix:    align the value to the HDS vocabulary (danger / sm|md|lg / neutral|danger|success|warning|info / comfortable|compact).',
);
console.error('  Exempt: add // vocab-ok: <reason> if a deviation is genuinely intentional.');
process.exit(1);
