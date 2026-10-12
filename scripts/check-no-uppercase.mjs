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
 * directions/, the top-level docs/*.html pages, hirobius.tokens.json and the
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

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname, basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const jsonMode = hasJsonFlag(process.argv);
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

const SCAN_DIRS = [
  'src',
  'docs-site',
  'preview',
  'starter-kit',
  'tools',
  'templates',
  'directions',
];
const SCAN_FILES = ['hirobius.tokens.json', 'figma/model.json', 'figma/snapshot.json'];
const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.json',
]);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'out',
  'coverage',
  '.source',
  '__tests__',
  'fixtures',
]);

/** Whether a repo-relative path is out of scope (tests prove translators). */
export function isExempt(rel) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(basename(rel));
}

/** Blanks comments (keeping every newline) so prose never reads as code. */
function maskComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[ \t;,{(])\/\/[^\n]*/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

/** [regex, message] pairs applied to every line. */
const LINE_PATTERNS = [
  [
    /(?<![\w-])text-transform\s*:\s*uppercase\b/g,
    'text-transform: uppercase (CSS or a Tailwind arbitrary property)',
  ],
  [/@apply\b[^;}\n]*(?<![\w-])uppercase(?![\w-])/g, '@apply uppercase'],
  [
    /(?<![\w-])(?:font-variant(?:-caps)?|fontVariant(?:Caps)?)\s*:\s*['"`]?(?:all-)?(?:small|petite)-caps\b/g,
    'small caps (font-variant)',
  ],
  [/(?<![\w-])titling-caps\b/g, 'titling caps (font-variant)'],
  [/['"]?\btextTransform['"]?\s*:\s*['"`]uppercase['"`]/g, 'textTransform: uppercase'],
  [
    /['"]?\btextCase['"]?\s*:\s*['"`](?:UPPER|SMALL_CAPS|SMALL_CAPS_FORCED)['"`]/g,
    'textCase: UPPER (all caps in the Figma model)',
  ],
  [
    /(?<!charAt\(0\))(?<!\[0\])\.(?:toUpperCase|toLocaleUpperCase)\s*\(/g,
    '.toUpperCase() for display (only a first-letter capital, charAt(0) or [0], is sentence case)',
  ],
];

// A string literal, single line, no nested quote of its own kind.
const STRING_LITERAL = /'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g;
const CLASSY_TOKEN = /^[\w:/[\].()%#!&>*=,-]*[-:[\]/][\w:/[\].()%#!&>*=,-]*$/;

/** Tailwind `uppercase` inside a class-list string literal. */
function findClassUppercase(line) {
  const hits = [];
  for (const m of line.matchAll(STRING_LITERAL)) {
    const body = m[1] ?? m[2] ?? m[3] ?? '';
    const tokens = body.split(/\s+/).filter(Boolean);
    const at = tokens.findIndex((t) => /^(?:[\w-]+:)*!?uppercase$/.test(t));
    if (at === -1) continue;
    // `textTransform: 'uppercase'` is its own pattern, not a class list.
    if (/textTransform['"]?\s*:\s*$/.test(line.slice(0, m.index))) continue;
    const others = tokens.filter((_, i) => i !== at);
    if (others.length === 0 || others.some((t) => CLASSY_TOKEN.test(t))) {
      hits.push(m.index + m[0].indexOf('uppercase'));
    }
  }
  return hits;
}

/**
 * Violations in one file's text: { file, line, col, rule, message, sample }.
 * @param {string} text
 * @param {string} file repo-relative path (extension decides comment masking)
 */
export function findViolationsInText(text, file) {
  const raw = text.split('\n');
  const isCode = CODE_EXTENSIONS.has(extname(file));
  const masked = (isCode ? maskComments(text) : text).split('\n');
  const out = [];

  const marker = (i) => {
    for (const j of [i, i - 1, i - 2]) {
      const m = /uppercase-ok:(.*)$/.exec(raw[j] ?? '');
      if (m) return /[A-Za-z]{3}/.test(m[1]) ? 'ok' : 'bare';
    }
    return null;
  };

  masked.forEach((line, i) => {
    if (!line.trim()) return;
    const found = [];
    for (const [re, what] of LINE_PATTERNS) {
      if (re.source.includes('toUpperCase') && !isCode) continue;
      for (const m of line.matchAll(re)) found.push([m.index, what]);
    }
    if (isCode || file.endsWith('.html')) {
      for (const col of findClassUppercase(line)) found.push([col, 'Tailwind uppercase class']);
    }
    if (found.length === 0) return;
    const mk = marker(i);
    if (mk === 'ok') return;
    found.sort((a, b) => a[0] - b[0]);
    const seen = new Set();
    for (const [col, what] of found) {
      if (seen.has(col)) continue;
      seen.add(col);
      out.push({
        file,
        line: i + 1,
        col,
        rule: mk === 'bare' ? 'uppercase-ok-needs-reason' : 'no-uppercase',
        message:
          mk === 'bare'
            ? `${what}: the uppercase-ok marker needs a reason after the colon`
            : `${what}: the system never produces ALL CAPS, use sentence case`,
        sample: raw[i].trim().slice(0, 140),
      });
    }
  });
  return out;
}

function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, results);
    else if (EXTENSIONS.has(extname(entry))) results.push(full);
  }
  return results;
}

function defaultFiles() {
  const files = [];
  for (const d of SCAN_DIRS) if (existsSync(join(ROOT, d))) collectFiles(join(ROOT, d), files);
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
    console.log('[ok] check-no-uppercase: nothing in the system transforms text to uppercase');
    process.exit(0);
  }
  console.error(
    `\n✗ check-no-uppercase: ${violations.length} place${violations.length === 1 ? '' : 's'} that make ALL CAPS text:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}] ${v.message}`);
    console.error(`    ${v.sample}`);
  }
  console.error('\nFix: drop the transform and write the text in sentence case.');
  console.error('  Exempt a line with // uppercase-ok: <reason> (the reason is required).\n');
  process.exit(1);
}
