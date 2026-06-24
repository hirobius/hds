#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/audit-sbom.mjs
 *
 * Generates a CycloneDX Software Bill of Materials at
 * docs/security/sbom.json. Manual channel — produces an artifact, not a
 * gate. Useful for the GRC narrative and supply-chain review.
 *
 * In fixture mode (--fixture-mode / HDS_FIXTURE_MODE=1 with FIXTURE_DIR set)
 * the script acts as a validator instead of a generator: it checks that
 * docs/security/sbom.json inside FIXTURE_DIR is a well-formed CycloneDX BOM
 * with at least one component entry. This lets the proof-of-firing harness
 * exercise the gate without running cyclonedx-npm.
 *
 * Usage: pnpm audit:sbom
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const argv = process.argv.slice(2);
const jsonMode = hasJsonFlag(argv);
const isFixtureMode = argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';

// Fixture mode: read inputs from a synthetic mini-root (proof-of-firing
// directory fixture — see docs/guardrails/FIXTURE_DIR_HARNESS.md). No-op in
// normal runs (FIXTURE_DIR unset).
const FIXTURE_DIR = process.env.FIXTURE_DIR;
const INPUT_ROOT = FIXTURE_DIR || ROOT;

const SBOM_PATH = join(INPUT_ROOT, 'docs/security/sbom.json');

const result = { violations: [], summary: {}, ok: true };

// ── Fixture / validation mode ──────────────────────────────────────────────
// When FIXTURE_DIR is set the gate validates an existing sbom.json rather
// than invoking cyclonedx-npm. This keeps the gate provable in the harness
// without a network call or installed toolchain.
if (isFixtureMode && FIXTURE_DIR) {
  if (!existsSync(SBOM_PATH)) {
    result.violations.push({
      file: 'docs/security/sbom.json',
      line: null,
      rule: 'SBOM_MISSING',
      severity: 'error',
      message: 'docs/security/sbom.json does not exist — run pnpm audit:sbom to generate it.',
    });
    result.ok = false;
    emitResult(result, jsonMode);
    process.exit(1);
  }

  let sbom;
  try {
    sbom = JSON.parse(readFileSync(SBOM_PATH, 'utf8'));
  } catch (err) {
    result.violations.push({
      file: 'docs/security/sbom.json',
      line: null,
      rule: 'SBOM_PARSE_ERROR',
      severity: 'error',
      message: `sbom.json is not valid JSON: ${String(err.message).slice(0, 200)}`,
    });
    result.ok = false;
    emitResult(result, jsonMode);
    process.exit(1);
  }

  if (sbom.bomFormat !== 'CycloneDX') {
    result.violations.push({
      file: 'docs/security/sbom.json',
      line: null,
      rule: 'SBOM_INVALID_FORMAT',
      severity: 'error',
      message: `sbom.json bomFormat is "${sbom.bomFormat || '(missing)'}" — expected "CycloneDX".`,
    });
    result.ok = false;
  }

  if (!Array.isArray(sbom.components) || sbom.components.length === 0) {
    result.violations.push({
      file: 'docs/security/sbom.json',
      line: null,
      rule: 'SBOM_EMPTY',
      severity: 'error',
      message: 'sbom.json components array is absent or empty — SBOM appears stale or corrupt.',
    });
    result.ok = false;
  }

  if (!result.ok) {
    emitResult(result, jsonMode);
    process.exit(1);
  }

  result.summary = { components: sbom.components.length, specVersion: sbom.specVersion };
  emitResult(result, jsonMode);
  process.exit(0);
}

// ── Normal generation mode ─────────────────────────────────────────────────
const OUT_DIR = join(ROOT, 'docs/security');
const OUT_FILE = join(ROOT, 'docs/security/sbom.json');

mkdirSync(OUT_DIR, { recursive: true });

try {
  // --ignore-npm-errors: pnpm workspaces install packages outside npm's lock
  // file, so `npm ls` (run internally by cyclonedx-npm) reports ELSPROBLEMS.
  // The flag suppresses those false-positive errors while still producing a
  // complete SBOM. No dependency swap needed — same @cyclonedx/cyclonedx-npm.
  execFileSync(
    'pnpm',
    [
      'exec',
      'cyclonedx-npm',
      '--ignore-npm-errors',
      '--output-file',
      OUT_FILE,
      '--output-format',
      'JSON',
    ],
    { stdio: jsonMode ? 'pipe' : 'inherit' },
  );
  result.summary = { outFile: OUT_FILE };
} catch (err) {
  result.violations.push({
    file: '*',
    line: null,
    rule: 'SBOM_GENERATION_FAILED',
    severity: 'error',
    message: `cyclonedx-npm failed: ${(err.message || String(err)).slice(0, 240)}`,
  });
  result.ok = false;
  emitResult(result, jsonMode);
  process.exit(1);
}

emitResult(result, jsonMode);
process.exit(0);
