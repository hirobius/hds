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
 *   - a `tone` prop on `<StatusListItem>` (its leading tone dot is gone, hds#759)
 *   - a `*-dot` status class (`status-dot`, `hds-dot`) in a class list or a CSS selector
 *   - a small round tone-coloured span: `rounded-full` + a size of 12px or less +
 *     a feedback or hue fill in one class list, or the same in one CSS rule
 *     (border-radius 50%, width up to 12px, a feedback/hue background). Avatars,
 *     spinners and a neutral `bg-current` rail marker are not flagged.
 *     A `cva()` whose base is `rounded-full` and whose variants add a tone fill
 *     is the same dot split across strings (StatusListItem's and Badge's were).
 *   - a filled-circle glyph or emoji used as a status mark (● ⬤ ◉ 🟢 🔴 …).
 *     A `•` bullet separator ("Ada • 3 min") is not flagged.
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

// A small round tone-coloured span (hds#759).
const ROUND = /^(?:[\w-]+:)*rounded-full$/;
const SMALL = /^(?:[\w-]+:)*(?:size|h|w)-(?:0\.5|1|1\.5|2|2\.5|3|\[(?:[1-9]|1[0-2])px\])$/;
const TONE_FILL =
  /^(?:[\w-]+:)*bg-(?:feedback-[\w-]+|(?:success|warning|danger|info|error|destructive)[\w-]*|(?:green|red|amber|yellow|emerald|lime|orange|rose)-\d+|\[(?:color:)?var\(--[^)]*(?:feedback|success|warning|danger|error|info)[^)]*\)\])$/;
const DOT_CLASS = /^(?:[\w-]+:)*[\w-]+-dot$/;
const DOT_SELECTOR = /\.(?:[\w-]+-)?dot(?![\w-])/;
const STATUS_GLYPH = /[●⬤◉🟢🟡🔴🟠🔵🟣]/u;
const CSS_RULE = /([^{}]*)\{([^{}]*)\}/g;

/**
 * A JSX tag's own attributes from `from` to its closing `>`, with every
 * `{expression}` blanked so a nested element's props are not read as the tag's.
 */
function topLevelAttrs(text, from) {
  let out = '';
  let depth = 0;
  let quote = null;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      if (depth === 0) out += c;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      if (depth === 0) out += c;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
    } else if (depth === 0) {
      if (c === '>') break;
      out += c;
    }
  }
  return out;
}

/** True when one CSS declaration block draws a small round tone-coloured dot. */
function isToneDotRule(body) {
  if (!/border-radius\s*:\s*(?:50%|100%|9{3,}px)/.test(body)) return false;
  const w = /(?:^|[;\s])(?:width|inline-size)\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
  if (!w || Number(w[1]) > 12) return false;
  return /background(?:-color)?\s*:[^;]*(?:feedback|success|warning|danger|error|info|green|red|amber)/.test(
    body,
  );
}

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

  // A `tone` on StatusListItem: the leading dot it coloured is gone.
  for (const m of maskedText.matchAll(/<StatusListItem\b/g)) {
    const tone = /(?<![\w-])tone=/.exec(topLevelAttrs(maskedText, m.index + m[0].length));
    if (tone) {
      found.push([
        lineOf(m.index),
        0,
        'no-status-list-item-tone',
        'StatusListItem `tone` is removed with its dot: put the status in a text Badge in `trailing`',
      ]);
    }
  }

  // A cva() dot: the round base and the tone fill sit in different strings.
  for (const m of maskedText.matchAll(/\bcva\(/g)) {
    let depth = 1;
    let end = m.index + m[0].length;
    while (end < maskedText.length && depth > 0) {
      if (maskedText[end] === '(') depth++;
      else if (maskedText[end] === ')') depth--;
      end++;
    }
    const tokens = [...maskedText.slice(m.index, end).matchAll(STRING_LITERAL)].flatMap((s) =>
      (s[1] ?? s[2] ?? s[3] ?? '').split(/\s+/),
    );
    if (tokens.some((t) => ROUND.test(t)) && tokens.some((t) => TONE_FILL.test(t))) {
      found.push([
        lineOf(m.index),
        0,
        'no-tone-dot',
        'Round cva with a tone fill: a status dot, write the status as text',
      ]);
    }
  }

  // CSS rules: a `*-dot` selector, or a small round tone-coloured block.
  for (const m of maskedText.matchAll(CSS_RULE)) {
    const selector = m[1].split(/[;}]/).pop();
    const at = lineOf(m.index + m[0].length - m[2].length - 1);
    if (DOT_SELECTOR.test(selector) && /^[\s\w.#:,>~+\-[\]="'()*]+$/.test(selector)) {
      found.push([
        at,
        0,
        'no-dot-class',
        '`*-dot` class: no status dots, write the status as text',
      ]);
    } else if (isToneDotRule(m[2])) {
      found.push([at, 0, 'no-tone-dot', 'Small round tone-coloured dot: write the status as text']);
    }
  }

  masked.forEach((line, i) => {
    const glyph = STATUS_GLYPH.exec(line);
    if (glyph) {
      found.push([
        i,
        glyph.index,
        'no-status-glyph',
        'Filled-circle glyph as a status mark: write the status as text',
      ]);
    }
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
      if (tokens.some((t) => DOT_CLASS.test(t))) {
        found.push([
          i,
          m.index,
          'no-dot-class',
          '`*-dot` class: no status dots, write the status as text',
        ]);
      } else if (
        tokens.some((t) => ROUND.test(t)) &&
        tokens.some((t) => SMALL.test(t)) &&
        tokens.some((t) => TONE_FILL.test(t))
      ) {
        found.push([
          i,
          m.index,
          'no-tone-dot',
          'Small round tone-coloured dot: write the status as text',
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
