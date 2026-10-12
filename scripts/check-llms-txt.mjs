#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-llms-txt.mjs
 *
 * Gate for the llms.txt index (hds#592). public/llms.txt (and its package-root
 * mirror llms.txt) must be a conformant index:
 *   - an H1 on the first line,
 *   - a `> ` one-line summary right after it,
 *   - every markdown link absolute and under LLMS_BASE_URL
 *     (scripts/lib/llms-index.mjs), pointing at a file that exists in the repo
 *     AND ships in package.json#files (so the URL resolves for a consumer),
 *   - no timestamp (the output must be stable between runs).
 *
 * Modes:
 *   - normal: checks public/llms.txt and llms.txt.
 *   - FIXTURE_FILE=<path> (set by validate-fixture-proof-of-firing): checks that
 *     one file.
 *
 * Exit: 0 = clean, 1 = violations.
 *
 * Usage: node scripts/check-llms-txt.mjs [--json]
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';
import { LLMS_BASE_URL } from './lib/llms-index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['public/llms.txt', 'llms.txt'];

/** True when `rel` is shipped by package.json#files (exact entry or a `dir/` entry). */
function ships(files, rel) {
  return files.some((f) => (f.endsWith('/') ? rel.startsWith(f) : rel === f));
}

/**
 * @param {string} text
 * @param {{ root?: string, file?: string }} [opts]
 * @returns {{ file: string, line: number|null, rule: string, severity: 'error', message: string }[]}
 */
export function checkLlmsTxt(text, { root = ROOT, file = 'llms.txt' } = {}) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const files = pkg.files ?? [];
  const out = [];
  const add = (line, rule, message) => out.push({ file, line, rule, severity: 'error', message });
  const lines = text.split('\n');

  if (!/^# \S/.test(lines[0] ?? '')) add(1, 'NO_H1', 'The first line must be an H1: `# Name`.');
  if (!/^> \S/.test(lines[2] ?? '') || (lines[1] ?? '') !== '') {
    add(3, 'NO_SUMMARY', 'An H1 must be followed by a blank line and a one-line `> ` summary.');
  }
  lines.forEach((l, i) => {
    if (/Generated:|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(l)) {
      add(i + 1, 'TIMESTAMP', 'No timestamp: the index must be identical between runs.');
    }
    for (const m of l.matchAll(/\[[^\]]*\]\(([^)\s]*)\)/g)) {
      const url = m[1];
      if (!/^https?:\/\//.test(url)) {
        add(i + 1, 'LINK_NOT_ABSOLUTE', `Link is not absolute: ${url}`);
        continue;
      }
      if (!url.startsWith(`${LLMS_BASE_URL}/`)) {
        add(i + 1, 'LINK_OFF_BASE', `Link is not under ${LLMS_BASE_URL}/: ${url}`);
        continue;
      }
      const rel = url.slice(LLMS_BASE_URL.length + 1);
      if (!existsSync(join(root, rel))) {
        add(i + 1, 'LINK_MISSING_FILE', `Link points at a file that does not exist: ${rel}`);
      } else if (!ships(files, rel)) {
        add(i + 1, 'LINK_NOT_IN_PACKAGE', `${rel} exists but is not in package.json#files.`);
      }
    }
  });
  return out;
}

function main() {
  const jsonMode = hasJsonFlag(process.argv.slice(2));
  const fixtureFile = process.env.FIXTURE_FILE;
  const targets = fixtureFile ? [fixtureFile] : TARGETS.map((t) => join(ROOT, t));
  const violations = [];
  for (const abs of targets) {
    const file = fixtureFile ?? abs.slice(ROOT.length + 1);
    if (!existsSync(abs)) {
      violations.push({
        file,
        line: null,
        rule: 'MISSING_FILE',
        severity: 'error',
        message: 'Run `pnpm llms:generate`.',
      });
      continue;
    }
    violations.push(...checkLlmsTxt(readFileSync(abs, 'utf8'), { file }));
  }
  const ok = violations.length === 0;
  if (!jsonMode) {
    if (ok) console.log('✓ check-llms-txt');
    else {
      for (const v of violations)
        console.error(`${v.file}:${v.line ?? '-'} ${v.rule} ${v.message}`);
      console.error(`✗ check-llms-txt: ${violations.length} violation(s)`);
    }
  }
  emitResult({ violations, summary: { files: targets.length }, ok }, jsonMode);
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
