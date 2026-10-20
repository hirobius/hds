#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-no-custom-tracking.mjs
 *
 * Adrian's rule (2026-10-16): never adjust letter-spacing beyond what the type
 * tokens set. The consumer-facing JSX side is the ESLint rule
 * hds/no-custom-tracking; this gate is the CSS side for this repo. It fails,
 * in src/**\/*.css, on
 *
 *   - `letter-spacing:` with a value that is not a type token:
 *     `var(--semantic-typography-*)` (or the primitive letterSpacing scale it
 *     resolves to), `inherit`, `unset` or `initial`
 *   - `@apply tracking-*`
 *
 * Not scanned: src/styles/tokens.generated.css (the token output itself),
 * comments, tests and fixtures. Exempt a line with
 * `/* tracking-ok: <reason> *\/` on the same line or either line above; the
 * reason is required.
 *
 * Run: node scripts/check-no-custom-tracking.mjs [--json]
 * Exit codes: 0 = clean, 1 = violations.
 */

import { readFileSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';
import { scanSources, findMarker, maskComments } from './lib/source-scan.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const jsonMode = hasJsonFlag(process.argv);
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

const SKIP_DIRS = ['node_modules', '.git', 'dist', 'coverage', '__tests__', 'fixtures'];
const GENERATED = ['src/styles/tokens.generated.css'];

const DECL_RE = /(?<![\w-])letter-spacing\s*:\s*([^;}\n]+)/g;
const APPLY_RE = /@apply\b[^;}\n]*(?<![\w-])-?tracking-[^\s;}]+/g;
const TOKEN_RE =
  /^var\(\s*--(?:semantic-typography|primitive-typography-letterSpacing)-[\w-]+\s*\)$/;
const RESET_RE = /^(?:inherit|unset|initial)$/;

const isTokenValue = (v) => {
  const t = v.replace(/!important/, '').trim();
  return TOKEN_RE.test(t) || RESET_RE.test(t);
};

/**
 * Violations in one CSS file's text: { file, line, col, rule, message, sample }.
 * @param {string} text
 * @param {string} file repo-relative path
 */
export function findViolationsInText(text, file) {
  const raw = text.split('\n');
  const masked = maskComments(text, { leadChars: ' \t;,{(' }).split('\n');
  const out = [];
  masked.forEach((line, i) => {
    if (!line.trim()) return;
    const found = [];
    for (const m of line.matchAll(DECL_RE)) {
      if (!isTokenValue(m[1])) {
        found.push([m.index, `letter-spacing: ${m[1].trim()} is not a type token`]);
      }
    }
    for (const m of line.matchAll(APPLY_RE)) found.push([m.index, '@apply tracking-* utility']);
    if (found.length === 0) return;
    const marker = findMarker(raw, i, 'tracking-ok', 2);
    const reasoned = marker && /[A-Za-z]{3}/.test(marker.reason);
    if (reasoned) return;
    for (const [col, what] of found) {
      out.push({
        file,
        line: i + 1,
        col,
        rule: marker ? 'tracking-ok-needs-reason' : 'no-custom-tracking',
        message: marker
          ? `${what}: the tracking-ok marker needs a reason after the colon`
          : `${what}: tracking comes from the type tokens only`,
        sample: raw[i].trim().slice(0, 140),
      });
    }
  });
  return out;
}

function defaultFiles() {
  return scanSources({
    root: ROOT,
    gate: 'check-no-custom-tracking',
    roots: [{ path: 'src' }],
    exts: ['.css'],
    skipDirs: SKIP_DIRS,
  }).filter((f) => !GENERATED.includes(relative(ROOT, f).replace(/\\/g, '/')));
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files = isFixtureMode && fixtureFile ? [resolve(fixtureFile)] : defaultFiles();
  const violations = [];
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    violations.push(...findViolationsInText(readFileSync(f, 'utf-8'), rel));
  }

  if (jsonMode) {
    emitResult(
      {
        violations: violations.map((v) => ({
          file: v.file,
          line: v.line,
          rule: v.rule,
          severity: 'error',
          message: v.message,
          sample: v.sample,
        })),
        summary: { total: violations.length },
        ok: violations.length === 0,
      },
      true,
    );
    process.exit(violations.length === 0 ? 0 : 1);
  }

  if (violations.length === 0) {
    console.log('[ok] check-no-custom-tracking: all letter-spacing comes from type tokens');
    process.exit(0);
  }
  console.error(
    `\n✗ check-no-custom-tracking: ${violations.length} hand-set letter-spacing${violations.length === 1 ? '' : 's'}:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}] ${v.message}`);
    console.error(`    ${v.sample}`);
  }
  console.error(
    '\nFix: use var(--semantic-typography-<role>-letter-spacing) or a .hds-type-<role> class.',
  );
  console.error('  Exempt a line with /* tracking-ok: <reason> */ (the reason is required).\n');
  process.exit(1);
}
