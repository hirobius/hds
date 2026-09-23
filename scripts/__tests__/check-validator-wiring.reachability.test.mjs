/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `pnpm-meta` must mean "runs", not "named in a script" (#265).
 *
 * The check reduced to
 *
 *     Object.values(scripts).some((cmd) => cmd.includes(gateScript))
 *
 * with no test that the referencing script is ever invoked. A reviewer proved
 * the dodge during #262 by adding a package.json script named
 * `totally:unused:nobody:calls:this` pointing at a fake gate — the validator
 * printed `declared pnpm-meta, detected pnpm-meta, ✓ wired as declared`.
 *
 * The measurement that followed is why the distinction is worth a test: of 147
 * package.json scripts, 16 are reachable from a hook, a CI step or an npm
 * lifecycle hook. Of 41 gates labelled `pnpm-meta`, 11 genuinely fire. The
 * other 30 are real, registered, runnable — and invoked by nothing. #265
 * estimated 18.
 *
 * `on-demand` is the honest name for those 30, and this pins both halves: the
 * dodge must fail, and a gate in a reachable script must still pass.
 */

import { mkdtempSync, cpSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, it, expect, afterEach } from 'vitest';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

let workspaces = [];
afterEach(() => {
  for (const w of workspaces) rmSync(w, { recursive: true, force: true });
  workspaces = [];
});

/**
 * A throwaway copy of the repo's wiring inputs, so the fixture can add a gate
 * without touching the real registry.
 */
function workspace({ scriptName, scriptCmd, channel }) {
  const dir = mkdtempSync(join(tmpdir(), 'hds-wiring-'));
  workspaces.push(dir);

  mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
  cpSync(join(ROOT, 'scripts'), join(dir, 'scripts'), { recursive: true });
  cpSync(join(ROOT, '.husky'), join(dir, '.husky'), { recursive: true });
  cpSync(join(ROOT, '.github'), join(dir, '.github'), { recursive: true });
  // ralph/gate.sh too: three gates declare firingChannels [..., 'ralph-gate'],
  // and without it the validator reports drift on THEM rather than on the
  // fixture — a copy that is incomplete makes the harness lie, not the gate.
  cpSync(join(ROOT, 'ralph'), join(dir, 'ralph'), { recursive: true });
  mkdirSync(join(dir, 'docs', 'guardrails'), { recursive: true });

  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  pkg.scripts[scriptName] = scriptCmd;
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
  registry.gates.push({
    id: 'check-fixture-dodge',
    description: 'Fixture gate for the reachability test. Not a real gate.',
    severity: 'warn',
    gateScript: 'scripts/check-fixture-dodge.mjs',
    owner: 'Adrian',
    source: 'agent',
    firingChannel: channel,
  });
  writeFileSync(join(dir, 'docs/guardrails/registry.json'), JSON.stringify(registry, null, 2));
  writeFileSync(join(dir, 'scripts', 'check-fixture-dodge.mjs'), 'process.exit(0);\n');

  return dir;
}

function runValidator(dir) {
  const { stdout, stderr, status } = spawnSync(
    process.execPath,
    [join(dir, 'scripts', 'check-validator-wiring.mjs')],
    { cwd: dir, encoding: 'utf8' },
  );
  return { out: `${stdout}${stderr}`, status };
}

describe('pnpm-meta requires the referencing script to actually run', () => {
  it('REJECTS a gate named only in a script nothing invokes — the #262 dodge', () => {
    const dir = workspace({
      scriptName: 'totally:unused:nobody:calls:this',
      scriptCmd: 'node scripts/check-fixture-dodge.mjs',
      channel: 'pnpm-meta',
    });
    const { out, status } = runValidator(dir);
    expect(status).not.toBe(0);
    expect(out).toMatch(/check-fixture-dodge/);
  });

  it('ACCEPTS the same gate when it declares on-demand instead', () => {
    // The honest label for "real, runnable, invoked by nothing".
    const dir = workspace({
      scriptName: 'totally:unused:nobody:calls:this',
      scriptCmd: 'node scripts/check-fixture-dodge.mjs',
      channel: 'on-demand',
    });
    expect(runValidator(dir).status).toBe(0);
  });

  it('ACCEPTS a gate in pretest, which pnpm test fires automatically', () => {
    // The guard that keeps the tightening from rejecting everything: pretest is
    // reachable because ci.yml runs `pnpm test`, so a gate there really does run.
    const dir = workspace({
      scriptName: 'pretest',
      scriptCmd: `${JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts.pretest} && node scripts/check-fixture-dodge.mjs`,
      channel: 'pnpm-meta',
    });
    expect(runValidator(dir).status).toBe(0);
  });

  it('REJECTS a gate in pretest that declares on-demand — the check runs both ways', () => {
    const dir = workspace({
      scriptName: 'pretest',
      scriptCmd: `${JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts.pretest} && node scripts/check-fixture-dodge.mjs`,
      channel: 'on-demand',
    });
    expect(runValidator(dir).status).not.toBe(0);
  });
});
