#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/audit-deps.mjs
 *
 * Dependency vulnerability audit. Wraps `pnpm audit --audit-level moderate
 * --json` and translates each advisory into a registry violation. Network
 * required — manual channel only (too slow for pre-commit). The same check
 * also runs in .github/workflows/quality.yml on push.
 *
 * Severity mapping:
 *   critical / high → error (gating)
 *   moderate / low  → warn (visible, non-gating)
 *
 * Usage: pnpm audit:deps
 *
 * Fixture mode: set FIXTURE_DIR=<abs path to mini-root> and HDS_FIXTURE_MODE=1
 * (plus --fixture-mode flag). The gate will read audit-output.json from the
 * fixture dir instead of running `pnpm audit`. No network, no lockfile needed.
 * See docs/guardrails/FIXTURE_DIR_HARNESS.md.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const argv = process.argv.slice(2);
const jsonMode = hasJsonFlag(argv);

// Fixture mode: read inputs from a synthetic mini-root (proof-of-firing
// directory fixture — see docs/guardrails/FIXTURE_DIR_HARNESS.md). No-op in
// normal runs (FIXTURE_DIR unset).
const FIXTURE_DIR = process.env.FIXTURE_DIR;

const result = { violations: [], summary: {}, ok: true };

let raw;

if (FIXTURE_DIR) {
  // In fixture mode, read a pre-baked pnpm-audit JSON response from the
  // fixture directory instead of hitting the network.
  const fixturePath = join(FIXTURE_DIR, 'audit-output.json');
  if (!existsSync(fixturePath)) {
    console.error(`✗ audit-deps (fixture mode): missing ${fixturePath}`);
    process.exit(2);
  }
  raw = readFileSync(fixturePath, 'utf8');
} else {
  try {
    raw = execFileSync('pnpm', ['audit', '--audit-level', 'moderate', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    raw = err.stdout?.toString() || '{}';
  }
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  parsed = {};
}

const advisories = parsed.advisories || {};
const counts = parsed.metadata?.vulnerabilities || {};

for (const [id, adv] of Object.entries(advisories)) {
  const sev = adv.severity || 'low';
  const isError = sev === 'critical' || sev === 'high';
  result.violations.push({
    file: 'package.json',
    line: null,
    rule: 'DEP_VULNERABILITY',
    severity: isError ? 'error' : 'warn',
    message: `${adv.module_name || adv.name}@${adv.vulnerable_versions || '?'}: ${sev} — ${(adv.title || '').slice(0, 120)} (advisory ${id})`,
    advisoryId: id,
  });
}

const errCount = result.violations.filter((v) => v.severity === 'error').length;
result.ok = errCount === 0;
result.summary = { ...counts, total: result.violations.length, errors: errCount };

emitResult(result, jsonMode);
process.exit(errCount > 0 ? 1 : 0);
