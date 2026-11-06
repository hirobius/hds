/**
 * check-validator-wiring --self-test (hds#1283): the hook fixtures prove the
 * bypass detector (|| true, ; true, exit 0, trailing &, if false, set +e,
 * missing strict argv). They once ran against the live registry, so the good
 * hook failed on drift and the bad hooks "failed" without their bypass ever
 * being checked. Each now runs against a registry that declares its gate
 * pre-commit; this keeps the suite green and honest.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

describe('check-validator-wiring --self-test', () => {
  const res = spawnSync(process.execPath, ['scripts/check-validator-wiring.mjs', '--self-test'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  it('passes every sub-test', () => {
    expect(res.stdout).toMatch(/(\d+)\/\1 sub-tests passed/);
    expect(res.status).toBe(0);
  });

  it('catches each bad hook on its own gate, not on registry drift', () => {
    expect(res.stdout).not.toMatch(/WIRING_DRIFT|MULTI_CHANNEL_DRIFT/);
    for (const f of [
      'bad-or-true',
      'bad-semi-true',
      'bad-exit-zero',
      'bad-trailing-amp',
      'bad-if-false',
      'bad-set-plus-e',
      'bad-missing-strict-argv',
    ])
      expect(res.stdout).toMatch(new RegExp(`✓ PASS\\s+${f}\\.husky-pre-commit`));
  });
});
