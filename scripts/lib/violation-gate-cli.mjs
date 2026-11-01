/**
 * scripts/lib/violation-gate-cli.mjs
 *
 * The shared CLI tail of the line-scanning gates (check-no-uppercase,
 * check-no-status-clutter, check-no-custom-tracking, check-type-ramp): scan a
 * file list with a `findViolationsInText(text, relPath)` function, then emit
 * the `--json` contract or the human report and exit. Behavior-preserving
 * extraction (hds#1010, jscpd hds#766).
 *
 * @module violation-gate-cli
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { emitResult } from './gate-output.mjs';

/**
 * Run `find` over every file; paths are passed repo-relative with `/` separators.
 * @param {string[]} files absolute paths
 * @param {(text: string, rel: string) => object[]} find
 * @param {string} root repo root the paths are made relative to
 */
export function scanFiles(files, find, root) {
  const violations = [];
  for (const f of files) {
    const rel = relative(root, f).replace(/\\/g, '/');
    violations.push(...find(readFileSync(f, 'utf-8'), rel));
  }
  return violations;
}

/**
 * Print the result and exit (0 clean, 1 on any violation).
 * @param {object} o
 * @param {object[]} o.violations { file, line, rule, message, sample? }
 * @param {boolean} o.jsonMode
 * @param {string} o.gate gate name
 * @param {string} o.okMessage printed on a clean run
 * @param {(count: number) => string} o.failHeading text after `✗ <gate>: `
 * @param {string[]} o.footer lines printed after the list (a blank line is added before)
 */
export function reportAndExit({ violations, jsonMode, gate, okMessage, failHeading, footer }) {
  const ok = violations.length === 0;
  if (jsonMode) {
    emitResult(
      {
        violations: violations.map((v) => ({
          file: v.file,
          line: v.line,
          rule: v.rule,
          severity: 'error',
          message: v.message,
          ...(v.sample ? { sample: v.sample } : {}),
        })),
        summary: { total: violations.length },
        ok,
      },
      true,
    );
    process.exit(ok ? 0 : 1);
  }
  if (ok) {
    console.log(okMessage);
    process.exit(0);
  }
  console.error(`\n✗ ${gate}: ${failHeading(violations.length)}:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}${v.line ? `:${v.line}` : ''}  [${v.rule}] ${v.message}`);
    if (v.sample) console.error(`    ${v.sample}`);
  }
  console.error(`\n${footer.join('\n')}\n`);
  process.exit(1);
}
