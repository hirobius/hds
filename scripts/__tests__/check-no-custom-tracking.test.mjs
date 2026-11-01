/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-no-custom-tracking.mjs (hds#756).
 * findViolationsInText runs in memory; the last blocks read the registry and
 * hook, run the gate on its fixtures, and run it over the repo.
 */
import { describe, it, expect } from 'vitest';
import { findViolationsInText } from '../check-no-custom-tracking.mjs';
import { usePrecommitGate } from './helpers/precommit-gate-harness.mjs';

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
  const { runOn, runRepo } = usePrecommitGate('check-no-custom-tracking');

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
    const run = runRepo();
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});
