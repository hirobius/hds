/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-tier-bypass.mjs
 *
 * Enforces the primitive → semantic → component aliasing hierarchy in source files.
 * Direct use of var(--primitive-*) in component and page files bypasses the semantic
 * tier, making design decisions impossible to update in a single place.
 *
 * Allowlisted files (may reference --primitive-* by design):
 *   - src/styles/tokens.generated.css — generated; defines all CSS custom properties
 *   - src/styles/theme.css          — bridges primitives to semantic vars
 *   - src/app/design-system/generated-tokens.ts — generated TS constants
 *
 * Suppression: add `// tier-ok: <reason>` on the offending line or immediately before.
 * In JSX children (where `//` renders as text), use a JSX block comment on the preceding line:
 *   {slash* tier-ok: <reason> *slash}  (replace "slash" with the actual slash character)
 */

import { join } from 'path';
import { exemptionContext } from './lib/gate-scope.mjs';
import { fileLines, gateContext, gateFiles } from './lib/source-scan.mjs';

const ctx = gateContext(import.meta.url);
const { ROOT } = ctx;

// Resolved absolute paths of files that legitimately use --primitive-* vars
const ALLOWLIST = new Set([
  join(ROOT, 'src', 'styles', 'tokens.generated.css'),
  // hds#449: the generated utility safelist keeps already-shipped utilities emitted; it adds none.
  join(ROOT, 'src', 'styles', 'utility-safelist.generated.css'),
  join(ROOT, 'src', 'styles', 'theme.css'),
  join(ROOT, 'src', 'app', 'design-system', 'generated-tokens.ts'),
  join(ROOT, 'src', 'app', 'design-system', 'generated-token-refs.ts'),
  // tokens.ts is the JS token bridge — it intentionally exposes primitive vars
  // as JavaScript constants (same pipeline role as generated-tokens.ts)
  join(ROOT, 'src', 'app', 'design-system', 'tokens.ts'),
  // generated-token-descriptions.ts: auto-generated string descriptions that quote primitive var names
  // for documentation purposes; the strings are not live CSS declarations
  join(ROOT, 'src', 'app', 'design-system', 'generated-token-descriptions.ts'),
]);

const TIER_BYPASS_RE = /var\(--primitive-/;

// Spec files stay in scope: a spec under src/ is held to the same tier rule.
const files = gateFiles(ctx, {
  gate: 'check-tier-bypass',
  roots: ['src'],
  exts: ['.tsx', '.ts', '.css'],
  includeSpecs: true,
  keep: (file) => !ALLOWLIST.has(file),
});
const violations = [];

for (const file of files) {
  const { rel, lines } = fileLines(ROOT, file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!TIER_BYPASS_RE.test(line)) continue;

    // Suppression: same line or immediately preceding line
    // Accepts `// tier-ok:` (JS) or `/* tier-ok:` (JSX block comment / CSS-style)
    const SUPPRESS = /\/\/\s*tier-ok:|\/\*\s*tier-ok:/;
    // The whole preceding comment block: a marker whose reason wraps onto a
    // second line was invisible, so wrapping one turned it back into a
    // violation whose suggested fix was the marker already sitting there.
    if (SUPPRESS.test(exemptionContext(lines, i))) continue;

    const match = line.match(/var\(--primitive-[^)]+\)/);
    violations.push({ file: rel, line: i + 1, pattern: match ? match[0] : 'var(--primitive-...)' });
  }
}

if (violations.length === 0) {
  console.log('✓ check-tier-bypass — no var(--primitive-*) references outside the token pipeline');
  process.exit(0);
} else {
  console.error(`\n✗ check-tier-bypass — ${violations.length} violation(s) found\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Pattern: ${v.pattern}`);
    console.error(
      `    Fix:     replace with var(--semantic-*) or var(--component-*), or add // tier-ok: <reason>\n`,
    );
  }
  process.exit(1);
}
