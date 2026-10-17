#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-no-status-clutter.mjs
 *
 * Adrian's rule (2026-10-16, hds#759): status clutter is out. Status is implied
 * by content, so no status dots and no coloured left accent bars on cards or
 * tiles. Fails on, in src/, docs-site/, preview/, starter-kit/, templates/ and tenants/:
 *
 *   - a `dot` prop on a `<Badge>` usage (a status dot)
 *   - a left-border bar (`border-l-2` to `border-l-8`, or `border-l-[2-8px]`)
 *     in a class list that also carries a tone colour (feedback, accent,
 *     primary, info, success, warning, danger). A neutral `border-border`
 *     rule (a blockquote) is not a status bar.
 *   - the `--hds-accent-bar` CSS variable, in any use or declaration
 *   - the Board column dot (`data-hds-board-dot`)
 *
 * Guideline the check cannot see: no heading over a card of supporting meta
 * (a "Status" heading far from its "Applied" badge). Keep label and value together.
 *
 * Not scanned: comments, tests and fixtures. Exempt a line with
 * `// status-clutter-ok: <reason>` on the same line or either of the two lines above.
 *
 * Run: node scripts/check-no-status-clutter.mjs [--json]
 * Exit codes: 0 = clean, 1 = violations.
 */

import { readFileSync } from 'node:fs';
import { join, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';
import { scanSources, findMarker, maskComments, isSpecFile } from './lib/source-scan.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const jsonMode = hasJsonFlag(process.argv);
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

const SCAN_DIRS = ['src', 'docs-site', 'preview', 'starter-kit', 'templates', 'tenants'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html'];
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
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
const COMMENT_LEADS = ' \t;,{(';

const BAR = /^(?:[\w-]+:)*border-l-(?:[2-8]|\[[2-8]px\])$/;
const TONE_COLOUR =
  /^(?:[\w-]+:)*border-(?:l-)?(?:feedback-[\w-]+|accent[\w-]*|primary[\w-]*|info|success|warning|danger|blue-[\w-]+)$/;

const STRING_LITERAL = /'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g;

export function isExempt(rel) {
  return isSpecFile(rel);
}

/** Violations in one file's text: { file, line, col, rule, message, sample }. */
export function findViolationsInText(text, file) {
  const raw = text.split('\n');
  const isCode = CODE_EXTENSIONS.has(extname(file));
  const maskedText = isCode ? maskComments(text, { leadChars: COMMENT_LEADS }) : text;
  const masked = maskedText.split('\n');
  const found = []; // [line index, col, rule, message]

  const lineOf = (offset) => maskedText.slice(0, offset).split('\n').length - 1;

  // A `dot` prop on a Badge tag, which may span lines.
  for (const m of maskedText.matchAll(/<Badge\b((?:[^>]|=>)*?)(?:\/>|>)/g)) {
    const props = m[1].replace(/=\{[^}]*\}|="[^"]*"|='[^']*'/g, '');
    const dot = /(?<![\w-])dot(?![\w-])/.exec(props);
    if (dot) {
      found.push([
        lineOf(m.index),
        0,
        'no-badge-dot',
        'Badge `dot` prop: status is implied by content, use a text Badge',
      ]);
    }
  }

  masked.forEach((line, i) => {
    for (const m of line.matchAll(/--hds-accent-bar\b/g)) {
      found.push([
        i,
        m.index,
        'no-accent-bar',
        '`--hds-accent-bar`: no coloured accent bars on cards or tiles',
      ]);
    }
    if (/data-hds-board-dot\b/.test(line)) {
      found.push([
        i,
        line.indexOf('data-hds-board-dot'),
        'no-board-dot',
        'Board column dot: the column title and count carry the status',
      ]);
    }
    for (const m of line.matchAll(STRING_LITERAL)) {
      const tokens = (m[1] ?? m[2] ?? m[3] ?? '').split(/\s+/).filter(Boolean);
      if (tokens.some((t) => BAR.test(t)) && tokens.some((t) => TONE_COLOUR.test(t))) {
        found.push([
          i,
          m.index,
          'no-accent-bar',
          'Coloured left-border bar: drop it, status is implied by content',
        ]);
      }
    }
  });

  const out = [];
  for (const [i, col, rule, message] of found) {
    const mk = findMarker(raw, i, 'status-clutter-ok', 2);
    if (mk && /[A-Za-z]{3}/.test(mk.reason)) continue;
    out.push({
      file,
      line: i + 1,
      col,
      rule: mk ? 'status-clutter-ok-needs-reason' : rule,
      message: mk ? 'the status-clutter-ok marker needs a reason after the colon' : message,
      sample: raw[i].trim().slice(0, 140),
    });
  }
  return out;
}

function defaultFiles() {
  return scanSources({
    root: ROOT,
    gate: 'check-no-status-clutter',
    roots: SCAN_DIRS.map((d) => ({ path: d, optional: true })),
    exts: EXTENSIONS,
    skipDirs: SKIP_DIRS,
    includeSpecs: true,
  }).filter((f) => !isExempt(relative(ROOT, f).replace(/\\/g, '/')));
}

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
    console.log('[ok] check-no-status-clutter: no status dots or coloured accent bars');
    process.exit(0);
  }
  console.error(`\n✗ check-no-status-clutter: ${violations.length} status dot or accent bar:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}] ${v.message}`);
    console.error(`    ${v.sample}`);
  }
  console.error(
    '\nFix: remove it; show status in the content (a text Badge). Exempt a line with // status-clutter-ok: <reason>.\n',
  );
  process.exit(1);
}
