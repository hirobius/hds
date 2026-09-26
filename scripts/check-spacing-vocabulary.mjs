#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-spacing-vocabulary.mjs
 *
 * hds#206 — spacing vocabulary gate. Adrian's decision (2026-09-26): spacing
 * uses t-shirt sizes (xs/sm/md/lg/xl — semantic.space.scale.*), and raw
 * integers are banned on padding/gap props. This is step one of that ban: a
 * WARN-severity gate (see docs/guardrails/registry.json) that flags the
 * banned form without yet blocking anything, so consumers can see the debt
 * before the codemod (hds#206 remaining work) migrates them.
 *
 * What it catches:
 *   A raw numeric literal on a spacing shorthand key (`p`, `m`, `gap`, `pt`,
 *   `pr`, `pb`, `pl`, `px`, `py`, `mt`, `mr`, `mb`, `ml`, `mx`, `my`,
 *   `rowGap`, `columnGap`) inside a Box `sx={{ ... }}` object literal —
 *   e.g. `sx={{ p: 2 }}` or `sx={{ gap: 4 }}`. This is the exact ambiguity
 *   from hds#206 defect 1: the numeric scale is a count of 4px units
 *   (`p: 4` renders 16px, not 4px), so a bare integer here is unpredictable
 *   at the call site.
 *
 * What it ignores:
 *   - String values (`p: 'md'`, `gap: 'var(--...)'`) — already named.
 *   - Non-sx object literals (style props are a different, existing gate:
 *     check-hardcoded-spacing.mjs).
 *   - Lines with `// spacing-vocab-ok: <reason>` on the same or preceding line.
 *
 * Fix: replace the integer with a named step off
 * `semantic.space.scale.{xs,sm,md,lg,xl}` (e.g. `sx={{ p: 'md' }}` once Box's
 * resolver accepts the named scale — tracked as hds#206 remaining work), or
 * suppress with `// spacing-vocab-ok: <reason>` for an intentional exception.
 *
 * Run: node scripts/check-spacing-vocabulary.mjs
 * Or:  pnpm check:spacing-vocabulary
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const jsonMode = hasJsonFlag(process.argv);
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// The `sx` spacing shorthand keys resolved by box-sx.ts's SPACING_PROP_MAP.
export const SPACING_KEYS = new Set([
  'm',
  'mt',
  'mr',
  'mb',
  'ml',
  'mx',
  'my',
  'p',
  'pt',
  'pr',
  'pb',
  'pl',
  'px',
  'py',
  'gap',
  'rowGap',
  'columnGap',
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '__tests__']);

/**
 * Scans a single file's text for banned raw-integer spacing values inside
 * `sx={{ ... }}` object literals (tracked between the opening `sx={{` and
 * its matching `}}`, so a multi-line sx object is still covered).
 *
 * @param {string} text
 * @param {string} rel - repo-relative path used in reported violations
 * @returns {Array<{file:string, line:number, key:string, value:string, raw:string}>}
 */
export function findViolationsInText(text, rel) {
  const lines = text.split('\n');
  const violations = [];
  let insideSx = false;

  const keyValueRe = new RegExp(
    `\\b(${[...SPACING_KEYS].join('|')})\\s*:\\s*(-?\\d+(?:\\.\\d+)?)\\b`,
    'g',
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const opensHere = !insideSx && line.includes('sx={{');
    if (opensHere) insideSx = true;

    if (insideSx) {
      // Only scan the sx-object portion of the line: from where the object
      // opens (or the start of the line, if it was already open) through
      // its closing `}}` (or the end of the line, if it doesn't close here).
      // Otherwise trailing prose after `}}` on the same line (e.g. a story
      // caption like "px: 6, py: 2 (axis shorthand)") gets double-scanned.
      const startIdx = opensHere ? line.indexOf('sx={{') : 0;
      const closeIdx = line.indexOf('}}', startIdx);
      const segment = closeIdx === -1 ? line.slice(startIdx) : line.slice(startIdx, closeIdx + 2);

      const isSuppressed =
        line.includes('spacing-vocab-ok') || (i > 0 && lines[i - 1].includes('spacing-vocab-ok'));

      if (!isSuppressed) {
        keyValueRe.lastIndex = 0;
        let m;
        while ((m = keyValueRe.exec(segment)) !== null) {
          violations.push({
            file: rel,
            line: i + 1,
            key: m[1],
            value: m[2],
            raw: line.trim().slice(0, 120),
          });
        }
      }

      if (closeIdx !== -1) insideSx = false;
    }
  }

  return violations;
}

function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIRS.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, results);
      continue;
    }
    const ext = extname(entry);
    if (ext === '.tsx' || ext === '.ts') results.push(full);
  }
  return results;
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files = isFixtureMode && fixtureFile ? [resolve(fixtureFile)] : collectFiles(SRC);

  const violations = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf-8');
    violations.push(...findViolationsInText(text, rel));
  }

  if (jsonMode) {
    const canonical = violations.map((v) => ({
      file: v.file,
      line: v.line,
      rule: 'spacing-vocabulary-raw-integer',
      severity: 'warn',
      message: `sx.${v.key}: ${v.value} — raw integer on a spacing prop; hds#206 bans this in favor of semantic.space.scale.{xs,sm,md,lg,xl}`,
      sample: v.raw,
    }));
    emitResult(
      { violations: canonical, summary: { total: violations.length }, ok: violations.length === 0 },
      true,
    );
    process.exit(violations.length === 0 ? 0 : 1);
  }

  if (violations.length === 0) {
    console.log('[ok] check-spacing-vocabulary — no raw integers on sx spacing props');
    process.exit(0);
  }

  console.error(
    `\n✗ check-spacing-vocabulary — ${violations.length} raw-integer spacing value(s) found (hds#206, warn-only for now):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.key}: ${v.value}]`);
    console.error(`    ${v.raw}`);
  }
  console.error('\nFix: use a named step off semantic.space.scale.{xs,sm,md,lg,xl} (hds#206), or');
  console.error('  suppress with // spacing-vocab-ok: <reason>\n');
  process.exit(1);
}
