#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-no-ordinal-labels.mjs
 *
 * Adrian's rule (2026-11-06): HDS never puts an ordinal number in front of a
 * page, section or nav name ("01 Getting started", "02 — Color", "1. Install").
 * Names stand on their own; order comes from position.
 *
 * Reads:
 *   - Markdown and MDX (content/): headings and the frontmatter title, outside
 *     fenced code blocks (``` or ~~~)
 *   - meta.json (content/): "title" values and "pages" entries
 *   - spec-sheet data (figma/spec-sheets/*.json): label keys (title, heading,
 *     section, label, name, page)
 *   - spec-sheet generators (scripts/generate-spec-sheets.mjs): string literals
 *
 * A label is ordinal when it starts with a zero-padded number ("01 Color",
 * "04Spacing") or with a number and a list mark (". ) · — – :"). "3 ways",
 * "2xs" and "0.33.1" stay allowed.
 *
 * Exempt a line with `ordinal-ok: <reason>` on the same line or either of the
 * two lines above (a real step-by-step sequence). The reason is required.
 *
 * Run: node scripts/check-no-ordinal-labels.mjs [--json]
 * Exit codes: 0 = clean, 1 = violations.
 */

import { existsSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scanSources,
  gateContext,
  reportLineViolations,
  textViolations,
  suppressionFor,
} from './lib/source-scan.mjs';

const { ROOT, jsonMode, isFixtureMode, fixtureFile } = gateContext(import.meta.url);

const ORDINAL = /^\s*(?:0\d\s*[.)·—–:-]?|\d{1,2}\s*[.)·—–:])\s*\p{L}/u;
const LABEL_KEYS = /^(title|heading|section|label|name|page)$/i;
const GENERATORS = new Set(['generate-spec-sheets.mjs']);
const suppressed = suppressionFor('ordinal-ok', { requireReason: true, lookback: 2 });

/** Whether a label starts with an ordinal number. */
export function isOrdinalLabel(label) {
  return ORDINAL.test(String(label).replace(/^-+/, ''));
}

function labelsOnLine(line, rel) {
  const ext = extname(rel);
  const name = basename(rel);
  if (ext === '.md' || ext === '.mdx') {
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) return [h[1]];
    const t = /^title:\s*['"]?(.*?)['"]?\s*$/.exec(line);
    return t ? [t[1]] : [];
  }
  if (name === 'meta.json') {
    const out = [];
    const t = /"title"\s*:\s*"([^"]*)"/.exec(line);
    if (t) out.push(t[1]);
    for (const m of line.matchAll(/"(-{3}[^"]*?-{3})"/g)) out.push(m[1].replace(/-+$/, ''));
    return out;
  }
  if (ext === '.json') {
    return [...line.matchAll(/"(\w+)"\s*:\s*"([^"]*)"/g)]
      .filter((m) => LABEL_KEYS.test(m[1]))
      .map((m) => m[2]);
  }
  if (GENERATORS.has(name)) {
    if (/^\s*(\/\/|\*)/.test(line)) return [];
    return [...line.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
  }
  return [];
}

/** Violations in one file's text: { file, line, rule, message, sample }. */
export function findViolationsInText(text, rel) {
  const lines = text.split('\n');
  const out = [];
  const markdown = /\.mdx?$/.test(rel);
  let fence = null; // the open fence marker (``` or ~~~), or null outside a code block
  lines.forEach((line, i) => {
    if (markdown) {
      const f = /^\s*(`{3,}|~{3,})/.exec(line);
      if (f && (!fence || f[1][0] === fence[0])) {
        fence = fence ? null : f[1];
        return;
      }
      if (fence) return;
    }
    const hit = labelsOnLine(line, rel).find(isOrdinalLabel);
    if (!hit || suppressed(lines, i)) return;
    out.push({
      file: rel,
      line: i + 1,
      rule: 'no-ordinal-label',
      message: `"${hit.trim()}" starts with an ordinal number; drop it.`,
      sample: line.trim(),
    });
  });
  return out;
}

function defaultFiles() {
  const files = scanSources({
    root: ROOT,
    gate: 'check-no-ordinal-labels',
    roots: [{ path: 'content', optional: true }],
    exts: ['.md', '.mdx', '.json'],
    skipDirs: ['node_modules', '.git'],
  });
  const sheets = join(ROOT, 'figma/spec-sheets');
  if (existsSync(sheets)) {
    for (const e of readdirSync(sheets)) if (e.endsWith('.json')) files.push(join(sheets, e));
  }
  for (const g of GENERATORS) {
    const p = join(ROOT, 'scripts', g);
    if (existsSync(p)) files.push(p);
  }
  return files;
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files = isFixtureMode && fixtureFile ? [resolve(fixtureFile)] : defaultFiles();
  const violations = textViolations(ROOT, files, findViolationsInText);
  process.exit(
    reportLineViolations(violations, jsonMode, {
      gate: 'check-no-ordinal-labels',
      ok: 'no page, section or nav name starts with an ordinal number',
      noun: (n) => `ordinal label${n === 1 ? '' : 's'}:`,
      fix: [
        '\nFix: drop the number ("Color", not "02 Color"). Order comes from position.',
        '  Exempt a real step sequence with ordinal-ok: <reason> (the reason is required).\n',
      ],
    }),
  );
}
