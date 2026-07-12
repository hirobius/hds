#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Design anti-pattern detector wrapping `npx impeccable detect` — 46 deterministic rules (typography, color, layout tells), no LLM, no API key. Manual channel only (npx fetch needs network).
 *
 * ─── ACCEPTANCE CRITERIA ──────────────────────────────────────────────────────
 * PASS: `impeccable detect` reports zero findings over the scanned targets.
 * FAIL: Any finding (overused fonts, purple-gradient tells, bounce easing,
 *       layout/typography anti-patterns, …) — exit 1 with one line per finding.
 * SKIP: npx / the impeccable package / network unavailable — exit 78 (the
 *       fixture harness's sanctioned "required tool unavailable" code).
 *
 * ─── SELF-IMPROVEMENT LOG ────────────────────────────────────────────────────
 * v1: Initial — thin wrapper, pins impeccable@3, maps detect findings to the
 *     canonical Violation shape (scripts/lib/gate-output.mjs).
 *
 * Upstream contract (verified against impeccable 3.x):
 *   `impeccable detect --json <targets…>` prints a JSON array of findings:
 *   { antipattern, name, description, severity, file (absolute), line, snippet }
 *   and exits 0 when clean, 2 when findings exist (eslint-style); any other
 *   exit means the tool itself failed. This wrapper owns final exit semantics.
 *   Project config (.impeccable/config.json, inline impeccable-disable
 *   comments, DESIGN.md context) is honored by the CLI itself.
 *
 * Run: node scripts/check-impeccable-detect.mjs [target…]   # default: src/
 * Or:  node scripts/check-impeccable-detect.mjs --json
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const argv = process.argv.slice(2);
const jsonMode = hasJsonFlag(argv);

// Fixture mode: scan only the harness-provided path (proof-of-firing contract).
const isFixtureMode = argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureTarget = process.env.FIXTURE_DIR || process.env.FIXTURE_FILE;

const cliTargets = argv.filter((a) => !a.startsWith('--'));
const targets =
  isFixtureMode && fixtureTarget ? [fixtureTarget] : cliTargets.length > 0 ? cliTargets : ['src/'];

const SKIP_EXIT = 78;
const TIMEOUT_MS = 120_000;

function skip(reason) {
  console.error(`[skip] check-impeccable-detect — ${reason}`);
  console.error('       Requires network for `npx --yes impeccable@3`; run manually when online.');
  process.exit(SKIP_EXIT);
}

const existingTargets = targets.filter((t) => existsSync(isAbsolute(t) ? t : join(ROOT, t)));
if (existingTargets.length === 0) {
  emitResult({ violations: [], summary: { total: 0, targets }, ok: true }, jsonMode);
  if (!jsonMode) console.log('[ok] check-impeccable-detect — no scan targets exist, nothing to do');
  process.exit(0);
}

const proc = spawnSync('npx', ['--yes', 'impeccable@3', 'detect', '--json', ...existingTargets], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: TIMEOUT_MS,
  shell: false,
});

if (proc.error) {
  skip(
    proc.error.code === 'ETIMEDOUT'
      ? 'npx timed out (offline?)'
      : `npx failed: ${proc.error.message}`,
  );
}
if (proc.status !== 0 && proc.status !== 2) {
  // 0 = clean, 2 = findings (eslint-style); anything else means the tool
  // itself failed (fetch error, bad install) — that's unavailability, not debt.
  skip(
    `impeccable exited ${proc.status}: ${(proc.stderr || '').trim().split('\n')[0] || 'no stderr'}`,
  );
}

let findings;
try {
  findings = JSON.parse(proc.stdout);
} catch {
  skip('could not parse impeccable --json output (upstream contract changed?)');
}
if (!Array.isArray(findings)) skip('unexpected impeccable --json shape (expected an array)');

const violations = findings.map((f) => ({
  file: f.file && isAbsolute(f.file) ? relative(ROOT, f.file).replace(/\\/g, '/') : f.file || '*',
  line: typeof f.line === 'number' ? f.line : null,
  rule: f.antipattern || 'impeccable-finding',
  severity: 'warn',
  message: `${f.name || f.antipattern}: ${f.snippet || f.description || ''}`.trim(),
}));

emitResult(
  {
    violations,
    summary: { total: violations.length, targets: existingTargets },
    ok: violations.length === 0,
  },
  jsonMode,
);

if (!jsonMode) {
  if (violations.length === 0) {
    console.log('[ok] check-impeccable-detect — no design anti-patterns found');
  } else {
    for (const v of violations) {
      console.log(`  ${v.file}:${v.line ?? '?'}  [${v.rule}] ${v.message}`);
    }
    console.log(`\n[fail] check-impeccable-detect — ${violations.length} finding(s)`);
  }
}

process.exit(violations.length === 0 ? 0 : 1);
