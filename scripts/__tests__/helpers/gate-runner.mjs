/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared spawn helpers for the gate tests in scripts/__tests__ (hds#1008).
 *
 * Every pre-commit gate test spawned its gate the same way: node on the
 * script, cwd at the repo root, and HDS_FIXTURE_MODE + FIXTURE_FILE to point
 * it at one fixture. This is that one copy.
 */
import { expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Spawn `node <gate> ...args` from ROOT; `fixtureFile` runs it in fixture mode on that file. */
export function runGate(gate, args = [], { fixtureFile } = {}) {
  const env = fixtureFile
    ? { ...process.env, HDS_FIXTURE_MODE: '1', FIXTURE_FILE: fixtureFile }
    : process.env;
  return spawnSync(process.execPath, [gate, ...args], { cwd: ROOT, encoding: 'utf8', env });
}

/** A `runOn(fixture)` that runs `gate --json` on `<fixtureDir>/<fixture>`. */
export const fixtureRunner = (gate, fixtureDir) => (fixture) =>
  runGate(gate, ['--json'], { fixtureFile: `${fixtureDir}/${fixture}` });

/** Run check-exemptions on one file, as `pnpm check` does over src/ and scripts/. */
export const runExemptionsOn = (file) =>
  runGate('scripts/check-exemptions.mjs', [], { fixtureFile: file });

/** The guardrail registry entry with this id, or undefined. */
export function registryEntry(id) {
  const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
  return registry.gates.find((g) => g.id === id);
}

/** The gate's run found nothing: `--json` lists no violations and it exits 0. */
export function expectNoViolations(run) {
  expect(JSON.parse(run.stdout).violations).toEqual([]);
  expect(run.status).toBe(0);
}

/** The gate ran over the repo silently and exited 0. */
export function expectCleanRun(run) {
  expect(run.stderr).toBe('');
  expect(run.status).toBe(0);
}

/** `.husky/pre-commit` runs `node <gate>` on a line of its own. */
export function expectInPreCommit(gate) {
  const hook = readFileSync(join(ROOT, '.husky/pre-commit'), 'utf8');
  expect(hook.split('\n')).toContain(`node ${gate}`);
}
