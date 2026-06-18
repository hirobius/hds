#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-secrets.mjs
 *
 * Pre-commit secrets scanner — wraps the `gitleaks` binary and registers it
 * in docs/guardrails/registry.json so it shows up in audits and fixture-proof
 * runs alongside every other gate. Without this wrapper, gitleaks runs as a
 * standalone husky line and is invisible to the registry / audit / closure-plan.
 *
 * Modes:
 *   - normal: scans the staged set (`gitleaks git --staged`).
 *   - FIXTURE_FILE=<path>: scans that single file (used by
 *     validate-fixture-proof-of-firing).
 *
 * Config: .gitleaks.toml (existing). Default rule set + repo allowlist.
 *
 * Exit codes match gitleaks: 0 = clean, 1 = leaks found, other = error.
 *
 * Usage: pnpm check:secrets
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const argv = process.argv.slice(2);
const jsonMode = hasJsonFlag(argv);
const fixtureFile = process.env.FIXTURE_FILE;

const CONFIG = '.gitleaks.toml';
const configArgs = existsSync(CONFIG) ? ['--config', CONFIG] : [];

// Fixture-mode skip sentinel. When the gitleaks binary is unavailable the gate
// cannot run, which is a SKIP — not a pass and not a firing. We exit with this
// code so validate-fixture-proof-of-firing maps it to skipped:true rather than
// misreading the tool error as "the passing fixture tripped the gate".
const SKIP_EXIT_CODE = 78;

let result = { violations: [], summary: { mode: '' }, ok: true };

let tempFixturePath = null;
try {
  if (fixtureFile) {
    // Single-file scan for fixture-proof-of-firing.
    // Copy the fixture to a temp dir outside any gitleaks allowlist paths
    // (the .gitleaks.toml allowlists .claude/worktrees/** to avoid false positives
    // in development; fixture files live there, so we copy them to /tmp first).
    result.summary.mode = 'fixture';
    const ext = extname(fixtureFile) || '.txt';
    tempFixturePath = join(tmpdir(), `hds-fixture-secrets-check-${Date.now()}${ext}`);
    writeFileSync(tempFixturePath, readFileSync(fixtureFile, 'utf8'), 'utf8');
    execFileSync(
      'gitleaks',
      ['dir', ...configArgs, '--no-banner', '--exit-code', '1', tempFixturePath],
      { stdio: jsonMode ? 'pipe' : 'inherit' },
    );
  } else {
    result.summary.mode = 'staged';
    execFileSync('gitleaks', ['git', ...configArgs, '--staged', '--verbose', '--no-banner'], {
      stdio: jsonMode ? 'pipe' : 'inherit',
    });
  }
} catch (err) {
  // gitleaks binary not installed → ENOENT (spawn failed, no exit status).
  // Degrade gracefully instead of erroring out:
  //   - fixture mode: emit the SKIP sentinel so proof-of-firing skips this gate.
  //   - staged mode:  warn but exit 0 — a missing optional scanner must never
  //     block a commit/CI run on its own.
  if (err?.code === 'ENOENT') {
    if (tempFixturePath) { try { unlinkSync(tempFixturePath); } catch {} }
    result.ok = true;
    result.summary.skipped = true;
    result.summary.skipReason = 'gitleaks binary not installed';
    if (!jsonMode) {
      console.error(
        'check-secrets: gitleaks not installed — skipping secrets scan (install gitleaks to enable this gate).',
      );
    }
    emitResult(result, jsonMode);
    process.exit(fixtureFile ? SKIP_EXIT_CODE : 0);
  }
  // Exit code 1 from gitleaks = leaks detected.
  // Other non-zero exit codes = tool error (bad config, etc.).
  const code = err?.status ?? 2;
  if (code === 1) {
    result.violations.push({
      file: fixtureFile || '*',
      line: null,
      rule: 'GITLEAKS_LEAK',
      severity: 'error',
      message:
        'gitleaks detected one or more secrets in the scanned set. See gitleaks output for findings.',
    });
    result.ok = false;
  } else {
    if (!jsonMode) {
      console.error(`check-secrets: gitleaks exited with code ${code}`);
    }
    result.violations.push({
      file: '*',
      line: null,
      rule: 'GITLEAKS_TOOL_ERROR',
      severity: 'error',
      message: `gitleaks exited with code ${code}`,
    });
    result.ok = false;
  }
  if (tempFixturePath) { try { unlinkSync(tempFixturePath); } catch {} }
  emitResult(result, jsonMode);
  process.exit(code === 1 ? 1 : code);
}

if (tempFixturePath) { try { unlinkSync(tempFixturePath); } catch {} }
emitResult(result, jsonMode);
process.exit(0);
