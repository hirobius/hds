/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#206 DoD "pnpm check green": check:full runs
 * `check-token-descriptions --no-missing`, which caps a $description at 20
 * words. The spacing slices (#297, #305) wrote long ones and stopped the chain
 * there. This runs the real gate on the semantic.space subtree, so the spacing
 * descriptions cannot grow past the limit again without a red test.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'hds-space-descriptions-'));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('semantic.space descriptions (hds#206)', () => {
  it('pass check-token-descriptions --no-missing (20 words at most)', () => {
    const fixture = join(dir, 'space.tokens.json');
    writeFileSync(fixture, JSON.stringify({ semantic: { space: tokens.semantic.space } }));
    const run = spawnSync(
      process.execPath,
      [join(ROOT, 'scripts/check-token-descriptions.mjs'), '--no-missing', '--fixture-mode'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FIXTURE_FILE: fixture } },
    );
    expect(run.stderr).not.toMatch(/VERBOSE|BLANK/);
    expect(run.status).toBe(0);
  });
});
