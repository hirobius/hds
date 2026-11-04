/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Gates that take their ROOT/fixture-mode preamble from gateContext
 * (hds#1010 slice 11) still honour FIXTURE_FILE + --fixture-mode: the
 * passing fixture exits 0 and the violating fixture exits 1.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATES = ['brand', 'dimensions', 'exemptions', 'motion', 'focus-states', 'ref-forwarding'];

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
  for (const name of readdirSync(dir)) {
    const want = name.startsWith('passing') ? 0 : 1;
    it(`${name} exits ${want}`, () => {
      expect(runFixture(gate, join(dir, name)).status).toBe(want);
    });
  }
});
