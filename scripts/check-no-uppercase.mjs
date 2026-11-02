#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-no-uppercase.mjs
 *
 * Adrian's rule (2026-10-12): the design system never produces ALL CAPS text.
 * Raw content from elsewhere may contain capitals (an acronym, a user's
 * string), but nothing we ship may transform text to uppercase. Sentence case
 * everywhere, eyebrows, labels, captions and table headers included.
 *
 * Fails on, in src/, docs-site/, preview/, starter-kit/, tools/, templates/,
 * tenants/, the top-level docs/*.html pages, hirobius.tokens.json and the
 * Figma model/snapshot:
 *
 *   - the Tailwind `uppercase` class (also variant-prefixed, `md:uppercase`),
 *     `@apply uppercase`, and `[text-transform:uppercase]`
 *   - CSS `text-transform: uppercase`
 *   - small caps: `font-variant: small-caps`, `font-variant-caps: all-small-caps`
 *   - `textTransform: 'uppercase'` in JS/TS and `"textTransform": "uppercase"` in JSON
 *   - `textCase: 'UPPER'` (also SMALL_CAPS, SMALL_CAPS_FORCED) in tokens or the Figma model
 *   - `.toUpperCase()` / `.toLocaleUpperCase()` in code, except the sentence-case
 *     idiom of capitalising a first letter (`charAt(0).toUpperCase()`, `[0].toUpperCase()`)
 *
 * Not scanned: comments in code files (prose may name the rule), tests and
 * fixtures (they prove translators such as the Figma model still map a value).
 *
 * Exempt a line with `// uppercase-ok: <reason>` on the same line or either of
 * the two lines above it. The reason is required; a bare marker still fails.
 *
 * Known limit: the Tailwind class is recognised inside a string literal that
 * also holds another class-shaped token (`text-xs uppercase`) or is exactly
 * `uppercase`, so a sentence like "must be uppercase" is not read as a class.
 * A class assembled at runtime is not followed.
 *
 * Run: node scripts/check-no-uppercase.mjs [--json]
 * Exit codes: 0 = clean, 1 = violations.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSources, isSpecFile, gateContext, reportLineViolations } from './lib/source-scan.mjs';
import { findUppercase } from '../bin/lib/visual-rules.mjs';

const { ROOT, jsonMode, isFixtureMode, fixtureFile } = gateContext(import.meta.url);

const SCAN_DIRS = ['src', 'docs-site', 'preview', 'starter-kit', 'tools', 'templates', 'tenants'];
const SCAN_FILES = ['hirobius.tokens.json', 'figma/model.json', 'figma/snapshot.json'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.json'];
const SKIP_DIRS = [
  'node_modules',
  '.git',
  'dist',
  '.next',
  'out',
  'coverage',
  '.source',
  '__tests__',
  'fixtures',
];

/**
 * Whether a repo-relative path is out of scope: tests prove translators, and
 * the generated utility safelist (hds#449) only keeps already-shipped utilities emitted.
 */
export function isExempt(rel) {
  return isSpecFile(rel) || rel === 'src/styles/utility-safelist.generated.css';
}

/**
 * Violations in one file's text: { file, line, col, rule, message, sample }.
 * The rule itself lives in bin/lib/visual-rules.mjs, shared with the consumer
 * `hds-check` CLI (hds#664), so the gate and the CLI cannot drift.
 */
export const findViolationsInText = findUppercase;

function defaultFiles() {
  const files = [
    ...scanSources({
      root: ROOT,
      gate: 'check-no-uppercase',
      roots: SCAN_DIRS.map((d) => ({ path: d, optional: true })),
      exts: EXTENSIONS,
      skipDirs: SKIP_DIRS,
      includeSpecs: true,
    }),
  ];
  for (const f of SCAN_FILES) if (existsSync(join(ROOT, f))) files.push(join(ROOT, f));
  const docs = join(ROOT, 'docs');
  for (const e of readdirSync(docs)) if (e.endsWith('.html')) files.push(join(docs, e));
  return files.filter((f) => !isExempt(relative(ROOT, f).replace(/\\/g, '/')));
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files = isFixtureMode && fixtureFile ? [resolve(fixtureFile)] : defaultFiles();
  const violations = [];
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    violations.push(...findViolationsInText(readFileSync(f, 'utf-8'), rel));
  }

  process.exit(
    reportLineViolations(violations, jsonMode, {
      gate: 'check-no-uppercase',
      ok: 'nothing in the system transforms text to uppercase',
      noun: (n) => `place${n === 1 ? '' : 's'} that make ALL CAPS text:`,
      fix: [
        '\nFix: drop the transform and write the text in sentence case.',
        '  Exempt a line with // uppercase-ok: <reason> (the reason is required).\n',
      ],
    }),
  );
}
