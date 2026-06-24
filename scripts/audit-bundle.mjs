#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/audit-bundle.mjs
 *
 * Generates a bundle composition report at docs/perf/bundle-report.html
 * using vite-bundle-visualizer. Manual channel — artifact, not gating.
 * Complements size-limit (which gates total size) by showing which
 * modules contribute to the bundle.
 *
 * Usage: pnpm audit:bundle
 *
 * Fixture mode: set FIXTURE_DIR=<abs path to mini-root> and HDS_FIXTURE_MODE=1
 * (plus --fixture-mode flag). The gate reads bundle-viz-output.json from the
 * fixture dir instead of running vite-bundle-visualizer. No build needed.
 * See docs/guardrails/FIXTURE_DIR_HARNESS.md.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const argv = process.argv.slice(2);
const jsonMode = hasJsonFlag(argv);

// Fixture mode: read inputs from a synthetic mini-root (proof-of-firing
// directory fixture — see docs/guardrails/FIXTURE_DIR_HARNESS.md). No-op in
// normal runs (FIXTURE_DIR unset).
const FIXTURE_DIR = process.env.FIXTURE_DIR;

const OUT_DIR = 'docs/perf';
const OUT_FILE = `${OUT_DIR}/bundle-report.html`;

const result = { violations: [], summary: {}, ok: true };

if (FIXTURE_DIR) {
  // In fixture mode, read a pre-baked bundle-viz outcome from the fixture
  // directory instead of running the live tool.
  const fixturePath = `${FIXTURE_DIR}/bundle-viz-output.json`;
  if (!existsSync(fixturePath)) {
    console.error(`✗ audit-bundle (fixture mode): missing ${fixturePath}`);
    process.exit(2);
  }
  let fixtureData;
  try {
    fixtureData = JSON.parse(readFileSync(fixturePath, 'utf8'));
  } catch {
    console.error(`✗ audit-bundle (fixture mode): could not parse ${fixturePath}`);
    process.exit(2);
  }
  if (fixtureData.ok === false) {
    const msg = fixtureData.message || 'vite-bundle-visualizer failed (fixture)';
    result.violations.push({
      file: '*',
      line: null,
      rule: 'BUNDLE_VIZ_FAILED',
      severity: 'error',
      message: `vite-bundle-visualizer failed: ${msg.slice(0, 240)}`,
    });
    result.ok = false;
    emitResult(result, jsonMode);
    process.exit(1);
  }
  result.summary = { outFile: OUT_FILE };
  emitResult(result, jsonMode);
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });

try {
  execFileSync('pnpm', ['exec', 'vite-bundle-visualizer', '-o', OUT_FILE], {
    stdio: jsonMode ? 'pipe' : 'inherit',
  });
  result.summary = { outFile: OUT_FILE };
} catch (err) {
  result.violations.push({
    file: '*',
    line: null,
    rule: 'BUNDLE_VIZ_FAILED',
    severity: 'error',
    message: `vite-bundle-visualizer failed: ${(err.message || String(err)).slice(0, 240)}`,
  });
  result.ok = false;
  emitResult(result, jsonMode);
  process.exit(1);
}

emitResult(result, jsonMode);
process.exit(0);
