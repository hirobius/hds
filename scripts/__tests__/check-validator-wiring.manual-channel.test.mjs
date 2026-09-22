/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `manual` must mean "never auto-fires".
 *
 * The registry's whole job is answering "where does this gate fire?". It could
 * not: `check-validator-wiring.mjs` accepted a gate declaring `manual` whose
 * real channel was `pnpm-meta`, so 24 gates were recorded as operator-only CLI
 * tools while in fact reachable from a `package.json` script. Six of those sit
 * in `pretest` and so run on every PR; the other 18 are reachable only from
 * `check:fast`, `check:full` or their own alias, none of which CI invokes.
 *
 * `check-source-canon` was the one that mattered: registered
 * `severity: warn, firingChannel: manual, archivedFrom: pre-commit`, and
 * simultaneously sitting in `pretest`, exiting 1 on any violation, with
 * `.github/workflows/ci.yml` running `pnpm test`. Reading the registry told
 * you the Swiss canon was dormant. Reading the wiring told you it was a
 * hard-fail CI gate. Both were checked in, and the meta-validator that exists
 * to catch exactly this contradiction printed
 * "✓ 54 gate(s) wired as declared."
 *
 * The allowance was one line, and deliberate-looking, which is why it survived:
 *
 *   else if (declared === 'manual' && (actual === 'none' || actual === 'pnpm-meta')) ok = true;
 *
 * It collapses the only distinction the field exists to draw. This test pins
 * the repaired meaning from the outside — spawning the real validator against
 * the real registry — so the allowance cannot be reintroduced as a convenience
 * the next time a gate is hard to classify.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/**
 * `id  declared  actual` rows from the validator's own --report output.
 *
 * Read with spawnSync, not execFileSync, deliberately: --report exits non-zero
 * when it finds drift, and the whole point of these tests is to run WHEN there
 * is drift. Throwing on that exit code would fail every test below for the same
 * uninformative reason instead of naming the gate that drifted.
 */
function reportRows() {
  const { stdout } = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts', 'check-validator-wiring.mjs'), '--report'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return (stdout || '')
    .split('\n')
    .map((line) => line.trim().split(/\s{2,}/))
    .filter((parts) => parts.length === 3 && /^[a-z][a-z0-9-]*$/.test(parts[0]))
    .map(([id, declared, actual]) => ({ id, declared, actual }));
}

describe('firingChannel honesty', () => {
  it('reports a row per gate, so a broken parse cannot pass vacuously', () => {
    expect(reportRows().length).toBeGreaterThan(40);
  });

  it('never records a gate as `manual` when it actually fires from pnpm-meta', () => {
    // The gate is running. Whatever else is true, the registry must not tell a
    // reader it is an operator-only tool.
    const lying = reportRows()
      .filter((r) => r.declared === 'manual' && r.actual !== 'none')
      .map((r) => `${r.id}: declared 'manual' but fires from '${r.actual}'`);

    expect(lying).toEqual([]);
  });

  it('keeps check-source-canon honest, the gate that exposed this', () => {
    const canon = reportRows().find((r) => r.id === 'check-source-canon');
    expect(canon).toBeDefined();
    expect(canon.actual).toBe('pnpm-meta');
    expect(canon.declared).toBe('pnpm-meta');
  });

  it('still passes the validator itself, which must agree with this rule', () => {
    // If the validator exits non-zero the rows above are moot — the two must
    // be consistent, or one of them is lying too.
    expect(() =>
      execFileSync(process.execPath, [join(ROOT, 'scripts', 'check-validator-wiring.mjs')], {
        cwd: ROOT,
        encoding: 'utf8',
      }),
    ).not.toThrow();
  });
});
