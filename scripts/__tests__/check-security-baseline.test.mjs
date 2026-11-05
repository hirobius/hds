/**
 * check-security-baseline: a committed .npmrc is policy (hds#1000); a credential
 * inside it is not.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'check-security-baseline.mjs');

function runWithNpmrc(npmrc) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'sec-baseline-'));
  try {
    writeFileSync(path.join(dir, 'package.json'), '{"name":"fixture"}\n');
    writeFileSync(path.join(dir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
    writeFileSync(path.join(dir, '.npmrc'), npmrc);
    return spawnSync('node', [SCRIPT], {
      cwd: REPO_ROOT,
      env: { ...process.env, FIXTURE_DIR: dir },
      encoding: 'utf8',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('check-security-baseline .npmrc', () => {
  it('accepts a committed .npmrc that only sets policy', () => {
    const r = runWithNpmrc('# policy\nsave-exact=true\n');
    expect(r.stderr).not.toContain('.npmrc');
    expect(r.status).toBe(0);
  });

  it('rejects a committed .npmrc carrying an auth token', () => {
    const r = runWithNpmrc('save-exact=true\n//registry.npmjs.org/:_authToken=abc123\n');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('credential committed in .npmrc');
  });
});
