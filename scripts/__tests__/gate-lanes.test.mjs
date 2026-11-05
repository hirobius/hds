/**
 * gate-lanes — check:fast / check:full live in docs/guardrails/registry.json
 * `lanes`, not as hand-written && chains in package.json (hds#1095).
 *
 * The parity block pins the exact chains package.json held before the move,
 * so this slice provably runs the same checks in the same order.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { expandLaneScripts, laneCommands, runLane } from '../lib/gate-lanes.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

// The chains exactly as package.json held them on main before hds#1095.
const OLD_CHAINS = {
  'check:fast':
    'node scripts/validate-manifest.mjs && node scripts/check-manifest-drift.mjs && node scripts/build-tokens.mjs && node scripts/verify-tokens.mjs && node scripts/audit-tokens.mjs --full && pnpm typecheck && node scripts/check-css-integrity.mjs && node scripts/audit-component-integrity.mjs --tokens && pnpm check:docs && node scripts/check-ref-forwarding.mjs && node scripts/check-hardcoded-spacing.mjs && node scripts/check-dimensions.mjs && node scripts/check-hardcoded-breakpoints.mjs && node scripts/check-typography-discipline.mjs && pnpm check:mojibake && node scripts/check-style-discipline.mjs --style-props-only && node scripts/check-tier-bypass.mjs && node scripts/check-link-integrity.mjs --doc-refs-only && node scripts/check-link-integrity.mjs --route-links-only && node scripts/check-brand.mjs && node scripts/check-template-source-of-truth.mjs',
  'check:full':
    'node scripts/validate-manifest.mjs && node scripts/check-manifest-drift.mjs && node scripts/build-tokens.mjs && node scripts/verify-tokens.mjs && node scripts/audit-tokens.mjs --full && pnpm typecheck && node scripts/check-css-integrity.mjs && node scripts/audit-component-integrity.mjs --tokens && pnpm check:docs && node scripts/check-contrast.mjs && node scripts/check-focus-states.mjs && node scripts/check-reduced-motion.mjs && node scripts/check-ref-forwarding.mjs && node scripts/check-hardcoded-spacing.mjs && node scripts/check-dimensions.mjs && node scripts/check-hardcoded-breakpoints.mjs && node scripts/check-unresponsive-grids.mjs && node scripts/check-motion.mjs && node scripts/check-typography-discipline.mjs && pnpm check:mojibake && node scripts/check-style-discipline.mjs && node scripts/check-hardcoded-colors.mjs && node scripts/check-tier-bypass.mjs && node scripts/check-token-structure.mjs && node scripts/check-security-baseline.mjs && node scripts/check-attributions.mjs && node scripts/check-exemptions.mjs && node scripts/check-brand.mjs && node scripts/audit-component-integrity.mjs --api && node scripts/check-token-descriptions.mjs --no-missing && node scripts/check-token-renames.mjs && node scripts/check-tailwind-token-coverage.mjs',
};

describe('lane parity with the old package.json chains', () => {
  it.each(Object.keys(OLD_CHAINS))(
    '%s: the registry lane runs the same commands in order',
    (lane) => {
      expect(laneCommands(registry, lane)).toEqual(OLD_CHAINS[lane].split(' && '));
    },
  );

  it.each(Object.keys(OLD_CHAINS))('%s: package.json delegates to the lane runner', (lane) => {
    expect(pkg.scripts[lane]).toBe(`node scripts/run-lane.mjs ${lane}`);
  });

  it('expanding the lanes gives the wiring checks the exact old script text', () => {
    const expanded = expandLaneScripts(pkg.scripts, registry);
    for (const [lane, chain] of Object.entries(OLD_CHAINS)) expect(expanded[lane]).toBe(chain);
    expect(expanded.pretest).toBe(pkg.scripts.pretest);
  });
});

describe('laneCommands', () => {
  it('returns null for an unknown lane or a registry without lanes', () => {
    expect(laneCommands(registry, 'check:nope')).toBeNull();
    expect(laneCommands({ gates: [] }, 'check:fast')).toBeNull();
  });
});

describe('expandLaneScripts', () => {
  it('inlines a lane call and leaves other scripts untouched', () => {
    const reg = { lanes: { a: ['node x.mjs', 'pnpm typecheck'] } };
    const out = expandLaneScripts({ a: 'node scripts/run-lane.mjs a', b: 'node y.mjs' }, reg);
    expect(out).toEqual({ a: 'node x.mjs && pnpm typecheck', b: 'node y.mjs' });
  });

  it('keeps a call to an unknown lane as-is', () => {
    const scripts = { a: 'node scripts/run-lane.mjs zzz' };
    expect(expandLaneScripts(scripts, { lanes: {} })).toEqual(scripts);
  });
});

describe('runLane', () => {
  it('runs every command in order and returns 0 when all pass', () => {
    const run = vi.fn(() => 0);
    expect(runLane(['a', 'b', 'c'], run)).toBe(0);
    expect(run.mock.calls.map((c) => c[0])).toEqual(['a', 'b', 'c']);
  });

  it('stops at the first failure and returns its exit code, like &&', () => {
    const run = vi.fn((cmd) => (cmd === 'b' ? 3 : 0));
    expect(runLane(['a', 'b', 'c'], run)).toBe(3);
    expect(run.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
  });
});
