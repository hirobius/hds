/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared harness for the pre-commit gate tests (check-layout-gap-vocabulary,
 * check-type-ramp, check-no-uppercase, check-no-custom-tracking; hds#1011).
 * Each gate is registered as an error at pre-commit, wired in
 * .husky/pre-commit, ships fixtures under fixtures/<id>/, and passes over the
 * repo, so those tests live here once. Call inside a `describe`.
 */
import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Registers the registry and hook tests for gate `id` and returns runners:
 * `runOn(fixtureFile)` runs it on one fixture with --json, `runRepo()` runs it
 * over the repo.
 */
export function usePrecommitGate(id) {
  const gate = `scripts/${id}.mjs`;
  const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
  const entry = registry.gates.find((g) => g.id === id);

  it('is registered as an error that fires at pre-commit, with its fixtures', () => {
    expect(entry).toMatchObject({
      gateScript: gate,
      severity: 'error',
      firingChannel: 'pre-commit',
      firingChannels: ['pre-commit'],
      fixturePath: `fixtures/${id}`,
      supportsJson: true,
    });
  });

  it('runs in .husky/pre-commit', () => {
    const hook = readFileSync(join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(new RegExp(`^node scripts/${id}\\.mjs$`, 'm'));
  });

  return {
    runOn: (fixture) =>
      spawnSync(process.execPath, [gate, '--json'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          HDS_FIXTURE_MODE: '1',
          FIXTURE_FILE: `fixtures/${id}/${fixture}`,
        },
      }),
    runRepo: () => spawnSync(process.execPath, [gate], { cwd: ROOT, encoding: 'utf8' }),
  };
}
