/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-no-style-prop.mjs
 *
 * Escape-hatch policy gate (#10/#12). The non-interactive feedback primitives —
 * Badge, Alert, Callout — are className-only: they expose NO `style` prop. These
 * components fully own their visual surface via CVA variants; a caller who needs
 * to nudge layout should wrap them, not inline-style them (inline `style` also
 * silently overrides governed tone/background/radius, which is the leak this
 * closes). Interactive/layout primitives (Button, Surface, Card, Icon, Input)
 * deliberately keep `style` for one-off visual treatments + layout and are out
 * of scope here.
 *
 * A primitive "exposes style" if either:
 *   A. it declares an explicit `style?:` / `style:` member, or
 *   B. its props interface extends an *HTMLAttributes type without `Omit`-ing
 *      'style' (HTMLAttributes carries `style`, so it leaks through ...rest).
 *
 * Scope: a fixed allowlist of feedback primitives (see TARGETS).
 * Exempt: add `// style-prop-ok: <reason>` anywhere in the file.
 *
 * Usage: node scripts/check-no-style-prop.mjs
 * Exit codes: 0 = clean, 1 = violations.
 */

import { readFileSync } from 'fs';
import { join, relative, resolve, basename } from 'path';

const ROOT = process.cwd();
const COMPONENTS_DIR = join(ROOT, 'src/app/components');

// The non-interactive feedback primitives held to className-only.
const TARGETS = ['alert.tsx', 'badge.tsx', 'callout.tsx'];

// Fixture mode: scan a single file (proof-of-firing harness). No-op in normal runs.
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// ── Rules ───────────────────────────────────────────────────────────────────

// A: an explicit `style` typed member (lowercase, word-boundaried so `textStyle`
// and `fontStyle` don't match), e.g. `style?: CSSProperties`.
const EXPLICIT_STYLE_RE = /(?:^|[^A-Za-z])style\s*\??\s*:\s*[A-Za-z{(]/m;

// B: the props interface header (everything between `interface XxxProps` and the
// opening `{`) — used to check the extends clause for an un-omitted HTMLAttributes.
const PROPS_HEADER_RE = /interface\s+\w*Props\b([\s\S]*?)\{/g;

/** Does this extends-clause pull in HTMLAttributes without Omit-ing 'style'? */
function leaksHtmlAttributesStyle(header) {
  if (!/HTMLAttributes\s*</.test(header)) return false;
  // Compliant when 'style' is omitted from the HTMLAttributes in an Omit<...>.
  // Matches `Omit<React.HTMLAttributes<HTMLSpanElement>, 'style' | ...>` and the
  // single-quote/double-quote, single-omit and union-omit shapes.
  const omitsStyle = /Omit<[\s\S]*?HTMLAttributes[\s\S]*?,[\s\S]*?['"]style['"]/.test(header);
  return !omitsStyle;
}

function findViolations(content) {
  const out = [];
  if (EXPLICIT_STYLE_RE.test(content)) {
    out.push(`declares an explicit \`style\` prop — feedback primitives are className-only`);
  }
  for (const m of content.matchAll(PROPS_HEADER_RE)) {
    if (leaksHtmlAttributesStyle(m[1])) {
      out.push(
        `props interface extends HTMLAttributes without \`Omit<…, 'style'>\` — \`style\` leaks through {...rest}`,
      );
    }
  }
  return out;
}

// ── Scanner ───────────────────────────────────────────────────────────────────

const entries =
  isFixtureMode && fixtureFile
    ? [resolve(fixtureFile)]
    : TARGETS.map((e) => join(COMPONENTS_DIR, e));

const violations = [];
for (const full of entries) {
  let content;
  try {
    content = readFileSync(full, 'utf-8');
  } catch {
    continue; // a renamed/removed target is not this gate's failure mode
  }
  if (content.includes('// style-prop-ok')) continue;
  for (const detail of findViolations(content)) {
    violations.push({ file: relative(ROOT, full).replace(/\\/g, '/'), detail });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log(
    `✓ check-no-style-prop — feedback primitives (${TARGETS.map((t) => basename(t, '.tsx')).join(', ')}) are className-only.`,
  );
  process.exit(0);
}

console.error(`✗ check-no-style-prop — ${violations.length} escape-hatch violation(s):`);
console.error('');
for (const { file, detail } of violations) {
  console.error(`  ${file}`);
  console.error(`    ${detail}`);
  console.error('');
}
console.error('  Fix:    drop the `style` prop; use `className` (the sanctioned escape hatch),');
console.error("          and `Omit<…HTMLAttributes…, 'style'>` if the interface extends one.");
console.error('  Exempt: add // style-prop-ok: <reason> if a primitive genuinely needs style.');
process.exit(1);
