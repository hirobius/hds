/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Canary for hds#263 — proves scripts/check-secrets.mjs goes RED where it
 * must, not only green.
 *
 *  1. CI + gitleaks missing  → hard-fail, message names gitleaks + install.
 *  2. local + gitleaks missing → graceful skip (exit 0 / fixture exit 78).
 *  3. a fake credential fixture → the gate reports GITLEAKS_LEAK and exits 1
 *     (via a gitleaks shim, so this runs everywhere; and via the real binary
 *     when one is on PATH).
 *
 * PATH is controlled per spawn so the outcome never depends on whether the
 * machine running the suite happens to have gitleaks installed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = path.join(REPO_ROOT, 'scripts', 'check-secrets.mjs');
const VIOLATING = path.join(REPO_ROOT, 'fixtures', 'check-secrets', 'violating.example.txt');
const PASSING = path.join(REPO_ROOT, 'fixtures', 'check-secrets', 'passing.example.txt');

let emptyBin;
let shimBin;

// Base env: drop CI and PATH so each case sets them explicitly.
const BASE_ENV = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => key !== 'CI' && key !== 'PATH' && key !== 'FIXTURE_FILE',
  ),
);

function runGate({ env = {}, pathDir, args = [] }) {
  return spawnSync(process.execPath, [GATE, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...BASE_ENV, PATH: pathDir, ...env },
  });
}

function hasRealGitleaks() {
  const r = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  return r.status === 0;
}

beforeAll(() => {
  emptyBin = mkdtempSync(path.join(os.tmpdir(), 'check-secrets-empty-'));
  shimBin = mkdtempSync(path.join(os.tmpdir(), 'check-secrets-shim-'));
  // Minimal gitleaks stand-in: exits 1 (leaks found) when the scanned path
  // (last arg) contains a Slack webhook URL, 0 otherwise.
  const shim = path.join(shimBin, 'gitleaks');
  writeFileSync(
    shim,
    `#!${process.execPath}
const fs = require('node:fs');
const target = process.argv[process.argv.length - 1];
let text = '';
try { text = fs.readFileSync(target, 'utf8'); } catch {}
process.exit(/hooks\\.slack\\.com\\/services\\//.test(text) ? 1 : 0);
`,
    'utf8',
  );
  chmodSync(shim, 0o755);
});

afterAll(() => {
  rmSync(emptyBin, { recursive: true, force: true });
  rmSync(shimBin, { recursive: true, force: true });
});

describe('check-secrets — gitleaks missing', () => {
  it('hard-fails in CI (staged mode) with an actionable message', () => {
    const r = runGate({ env: { CI: 'true' }, pathDir: emptyBin });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/gitleaks/);
    expect(r.stderr).toMatch(/CI/);
    expect(r.stderr).toMatch(/install/i);
    expect(r.stderr).toMatch(/github\.com\/gitleaks\/gitleaks/);
    expect(r.stderr).not.toMatch(/skipping secrets scan/);
  });

  it('hard-fails in CI in fixture mode too (no exit-78 skip sentinel)', () => {
    const r = runGate({ env: { CI: '1', FIXTURE_FILE: VIOLATING }, pathDir: emptyBin });
    expect(r.status).not.toBe(0);
    expect(r.status).not.toBe(78);
    expect(r.stderr).toMatch(/gitleaks/);
  });

  it('reports the failure in --json mode', () => {
    const r = runGate({ env: { CI: 'true' }, pathDir: emptyBin, args: ['--json'] });
    expect(r.status).not.toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.ok).toBe(false);
    expect(out.violations.map((v) => v.rule)).toContain('GITLEAKS_MISSING_IN_CI');
  });

  it('keeps the graceful local skip when CI is unset', () => {
    const r = runGate({ pathDir: emptyBin });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/skipping secrets scan/);
  });

  it('treats CI=false as local', () => {
    const r = runGate({ env: { CI: 'false' }, pathDir: emptyBin });
    expect(r.status).toBe(0);
  });

  it('keeps the fixture-mode skip sentinel locally', () => {
    const r = runGate({ env: { FIXTURE_FILE: VIOLATING }, pathDir: emptyBin });
    expect(r.status).toBe(78);
  });
});

describe('check-secrets — canary: a fake credential turns the gate red', () => {
  it('fails on the violating fixture (gitleaks shim)', () => {
    const r = runGate({
      env: { CI: 'true', FIXTURE_FILE: VIOLATING },
      pathDir: shimBin,
      args: ['--json'],
    });
    expect(r.status).toBe(1);
    const out = JSON.parse(r.stdout);
    expect(out.ok).toBe(false);
    expect(out.violations.map((v) => v.rule)).toContain('GITLEAKS_LEAK');
  });

  it('passes on the clean fixture (gitleaks shim)', () => {
    const r = runGate({ env: { CI: 'true', FIXTURE_FILE: PASSING }, pathDir: shimBin });
    expect(r.status).toBe(0);
  });

  it.skipIf(!hasRealGitleaks())('fails on the violating fixture (real gitleaks)', () => {
    const r = runGate({
      env: { CI: 'true', FIXTURE_FILE: VIOLATING },
      pathDir: process.env.PATH,
    });
    expect(r.status).toBe(1);
  });

  it.skipIf(!hasRealGitleaks())('passes on the clean fixture (real gitleaks)', () => {
    const r = runGate({
      env: { CI: 'true', FIXTURE_FILE: PASSING },
      pathDir: process.env.PATH,
    });
    expect(r.status).toBe(0);
  });
});
