/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-no-custom-tracking.mjs (hds#756).
 * findViolationsInText runs in memory; the last blocks read the registry and
 * hook, run the gate on its fixtures, and run it over the repo.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findViolationsInText } from '../check-no-custom-tracking.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = 'scripts/check-no-custom-tracking.mjs';
const count = (text) => findViolationsInText(text, 'x.css').length;

describe('findViolationsInText', () => {
  it('flags a raw letter-spacing value', () => {
    expect(count('.a { letter-spacing: 0.08em; }')).toBe(1);
    expect(count('.a { letter-spacing: 1px !important; }')).toBe(1);
    expect(count('.a { letter-spacing: normal; }')).toBe(1);
  });

  it('flags @apply tracking-*', () => {
    expect(count('.a { @apply tracking-wide; }')).toBe(1);
    expect(count('.a { @apply text-xs tracking-widest; }')).toBe(1);
  });

  it('allows type tokens and resets', () => {
    expect(count('.a { letter-spacing: var(--semantic-typography-ui-letter-spacing); }')).toBe(0);
    expect(count('.a { letter-spacing: var(--primitive-typography-letterSpacing-tight); }')).toBe(
      0,
    );
    expect(count('.a { letter-spacing: inherit; }')).toBe(0);
  });

  it('does not read token definitions, comments or other properties', () => {
    expect(count(':root { --semantic-typography-x-letter-spacing: 0.1em; }')).toBe(0);
    expect(count('/* letter-spacing: 0.1em */')).toBe(0);
    expect(count('.a { word-spacing: 0.1em; }')).toBe(0);
  });

  it('exempts a line with tracking-ok and a reason; a bare marker still fails', () => {
    expect(count('/* tracking-ok: vendor widget */\n.a { letter-spacing: 1px; }')).toBe(0);
    const v = findViolationsInText('.a { letter-spacing: 1px; } /* tracking-ok: */', 'x.css');
    expect(v.map((x) => x.rule)).toEqual(['tracking-ok-needs-reason']);
  });
});

describe('check-no-custom-tracking: registry, hook, fixtures and the repo', () => {
  const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
  const entry = registry.gates.find((g) => g.id === 'check-no-custom-tracking');

  it('is registered as an error that fires at pre-commit, with its fixtures', () => {
    expect(entry).toMatchObject({
      gateScript: GATE,
      severity: 'error',
      firingChannel: 'pre-commit',
      firingChannels: ['pre-commit'],
      fixturePath: 'fixtures/check-no-custom-tracking',
      supportsJson: true,
    });
  });

  it('runs in .husky/pre-commit', () => {
    const hook = readFileSync(join(ROOT, '.husky/pre-commit'), 'utf8');
    expect(hook).toMatch(/^node scripts\/check-no-custom-tracking\.mjs$/m);
  });

  const runOn = (fixture) =>
    spawnSync(process.execPath, [GATE, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        HDS_FIXTURE_MODE: '1',
        FIXTURE_FILE: `fixtures/check-no-custom-tracking/${fixture}`,
      },
    });

  it('exits 1 on the canary, naming each file:line', () => {
    const run = runOn('violating.example.css');
    expect(run.status).toBe(1);
    const { violations } = JSON.parse(run.stdout);
    expect(violations.map((v) => [v.line, v.rule])).toEqual([
      [3, 'no-custom-tracking'],
      [6, 'no-custom-tracking'],
      [9, 'no-custom-tracking'],
      [13, 'tracking-ok-needs-reason'],
    ]);
  });

  it('exits 0 on the passing fixture', () => {
    expect(runOn('passing.example.css').status).toBe(0);
  });

  it('exits 0 over the repo', () => {
    const run = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});
