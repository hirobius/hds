/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Canary for hds#264 — proves the vacuity guard in scripts/audit-tiers.mjs
 * actually fires: pointed at a directory with zero files matching its
 * naming pattern, the gate must exit non-zero and name what it found
 * instead, rather than silently writing docs/audits/TIER_AUDIT.md over an
 * empty result set (the bug this issue reports).
 *
 * Runs the real CLI as a subprocess against the fixture directory at
 * fixtures/audit-tiers/empty-components.example.d/ (FIXTURE_DIR redirects
 * COMPONENTS_DIR / MANIFEST_PATH — see scripts/audit-tiers.mjs's INPUT_ROOT).
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = path.join(ROOT, 'scripts', 'audit-tiers.mjs');
const EMPTY_FIXTURE = path.join(ROOT, 'fixtures', 'audit-tiers', 'empty-components.example.d');

function run(fixtureDir, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [GATE, ...args], {
      cwd: ROOT,
      env: { ...process.env, FIXTURE_DIR: fixtureDir },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

describe('audit-tiers vacuity guard', () => {
  it('exits non-zero and names the pattern + what it found, walking an empty components dir', () => {
    const result = run(EMPTY_FIXTURE);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/walked 0 files matching/);
    expect(result.stderr).toMatch(/found 0 \.tsx files/);
  });

  it('the same guard fires in --dry-run mode, not just the default write path', () => {
    const result = run(EMPTY_FIXTURE, ['--dry-run']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/walked 0 files matching/);
  });
});
