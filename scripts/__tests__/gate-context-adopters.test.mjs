/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Gates that take their ROOT/fixture-mode preamble from gateContext
 * (hds#1010 slice 11) still honour FIXTURE_FILE + --fixture-mode: the
 * passing fixture exits 0 and the violating fixture exits 1.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATES = [
  'brand',
  'dimensions',
  'exemptions',
  'motion',
  'focus-states',
  'ref-forwarding',
  // hds#1010 slice 12
  'licenses',
  'secrets',
  'token-structure',
  'token-descriptions',
  'token-paths-ratchet',
];
// Exit code the gates use when a required external tool (gitleaks) is missing.
const SKIP_EXIT = 78;

function runFixture(gate, file) {
  return spawnSync(
    process.execPath,
    [join(REPO, 'scripts', `check-${gate}.mjs`), '--fixture-mode'],
    {
      cwd: REPO,
      env: { ...process.env, FIXTURE_FILE: file, HDS_FIXTURE_MODE: '1' },
      encoding: 'utf8',
    },
  );
}

describe.each(GATES)('check-%s fixture mode', (gate) => {
  const dir = join(REPO, 'fixtures', `check-${gate}`);
  it('takes its preamble from gateContext', () => {
    const src = readFileSync(join(REPO, 'scripts', `check-${gate}.mjs`), 'utf8');
    expect(src).toMatch(/gateContext\(import\.meta\.url\)/);
  });
  // token-paths-ratchet scans source files; its .json fixtures are not scanned.
  const scanned = (n) => gate !== 'token-paths-ratchet' || n.endsWith('.tsx');
  for (const name of readdirSync(dir).filter(scanned)) {
    const want = name.startsWith('passing') ? 0 : 1;
    it(`${name} exits ${want}`, () => {
      const { status } = runFixture(gate, join(dir, name));
      if (status === SKIP_EXIT) return; // tool unavailable: the gate skips visibly
      expect(status).toBe(want);
    });
  }
});
