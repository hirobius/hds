/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/__tests__/helpers/gate-runner.mjs (hds#1008): the
 * shared spawn helpers the pre-commit gate tests run their gate through.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  runGate,
  fixtureRunner,
  runExemptionsOn,
  registryEntry,
} from './helpers/gate-runner.mjs';

describe('gate-runner', () => {
  it('ROOT is the repo root', () => {
    expect(existsSync(join(ROOT, 'package.json'))).toBe(true);
    expect(existsSync(join(ROOT, 'scripts/__tests__'))).toBe(true);
  });

  it('runGate spawns node on the script from ROOT', () => {
    const run = runGate('scripts/check-no-uppercase.mjs');
    expect(run.status).toBe(0);
    expect(typeof run.stdout).toBe('string');
  });

  it('runGate with fixtureFile sets fixture mode', () => {
    const run = runGate('scripts/check-no-uppercase.mjs', ['--json'], {
      fixtureFile: 'fixtures/check-no-uppercase/violating.example.tsx',
    });
    expect(run.status).toBe(1);
    expect(JSON.parse(run.stdout).violations.length).toBeGreaterThan(0);
  });

  it('fixtureRunner runs the gate with --json on a file under its fixture dir', () => {
    const runOn = fixtureRunner('scripts/check-no-uppercase.mjs', 'fixtures/check-no-uppercase');
    expect(runOn('passing.example.tsx').status).toBe(0);
  });

  it('runExemptionsOn runs check-exemptions on one file', () => {
    expect(runExemptionsOn('scripts/check-no-uppercase.mjs').status).toBe(0);
  });

  it('registryEntry finds a gate by id', () => {
    expect(registryEntry('check-no-uppercase').gateScript).toBe('scripts/check-no-uppercase.mjs');
    expect(registryEntry('no-such-gate')).toBeUndefined();
  });
});
