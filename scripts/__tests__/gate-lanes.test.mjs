/**
 * gate-lanes — check:fast, check:full and pretest live in docs/guardrails/registry.json
 * `lanes`, not as hand-written && chains in package.json (hds#1095).
 *
 * The parity block pins the exact chains package.json held before the move,
 * so this slice provably runs the same checks in the same order.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  expandLaneCalls,
  expandLaneScripts,
  laneCommands,
  readLaneScripts,
  runLane,
} from '../lib/gate-lanes.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const registry = JSON.parse(readFileSync(join(ROOT, 'docs/guardrails/registry.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

// The chains exactly as package.json held them on main before hds#1095.
const OLD_CHAINS = {
  'check:fast':
    'node scripts/validate-manifest.mjs && node scripts/check-manifest-drift.mjs && node scripts/build-tokens.mjs && node scripts/verify-tokens.mjs && node scripts/audit-tokens.mjs --full && pnpm typecheck && node scripts/check-css-integrity.mjs && node scripts/audit-component-integrity.mjs --tokens && pnpm check:docs && node scripts/check-ref-forwarding.mjs && node scripts/check-hardcoded-spacing.mjs && node scripts/check-dimensions.mjs && node scripts/check-hardcoded-breakpoints.mjs && node scripts/check-typography-discipline.mjs && pnpm check:mojibake && node scripts/check-style-discipline.mjs --style-props-only && node scripts/check-tier-bypass.mjs && node scripts/check-link-integrity.mjs --doc-refs-only && node scripts/check-link-integrity.mjs --route-links-only && node scripts/check-brand.mjs && node scripts/check-template-source-of-truth.mjs',
  'check:full':
    'node scripts/validate-manifest.mjs && node scripts/check-manifest-drift.mjs && node scripts/build-tokens.mjs && node scripts/verify-tokens.mjs && node scripts/audit-tokens.mjs --full && pnpm typecheck && node scripts/check-css-integrity.mjs && node scripts/audit-component-integrity.mjs --tokens && pnpm check:docs && node scripts/check-contrast.mjs && node scripts/check-focus-states.mjs && node scripts/check-reduced-motion.mjs && node scripts/check-ref-forwarding.mjs && node scripts/check-hardcoded-spacing.mjs && node scripts/check-dimensions.mjs && node scripts/check-hardcoded-breakpoints.mjs && node scripts/check-unresponsive-grids.mjs && node scripts/check-motion.mjs && node scripts/check-typography-discipline.mjs && pnpm check:mojibake && node scripts/check-style-discipline.mjs && node scripts/check-hardcoded-colors.mjs && node scripts/check-tier-bypass.mjs && node scripts/check-token-structure.mjs && node scripts/check-security-baseline.mjs && node scripts/check-attributions.mjs && node scripts/check-exemptions.mjs && node scripts/check-brand.mjs && node scripts/audit-component-integrity.mjs --api && node scripts/check-token-descriptions.mjs --no-missing && node scripts/check-token-renames.mjs && node scripts/check-tailwind-token-coverage.mjs',
  pretest:
    'node scripts/validate-manifest.mjs && node scripts/check-manifest-drift.mjs && node scripts/check-manifest-schema-semver.mjs && node scripts/audit-component-integrity.mjs --completeness && node scripts/audit-component-integrity.mjs --api && node scripts/check-ref-forwarding.mjs && node scripts/check-source-canon.mjs && node scripts/check-binding-drift.mjs && node scripts/check-component-token-binding.mjs --report && node scripts/check-tenant-tokens.mjs && node scripts/check-tailwind-spacing-scale.mjs --ratchet && node scripts/check-props-exports.mjs && knip --no-exit-code && node scripts/check-dark-alias-flip.mjs && node scripts/check-focus-states.mjs && node scripts/check-no-status-clutter.mjs && node scripts/generate-consumer-skill.mjs --check && node scripts/check-version-stamps.mjs && node scripts/generate-agents-md.mjs --check && node scripts/check-llms-txt.mjs && node scripts/check-deprecations.mjs && node scripts/build-deprecations.mjs --check && node scripts/upgrade/schema.mjs --check && node scripts/upgrade/compile.mjs --check && node scripts/build-utility-safelist.mjs --check && node scripts/check-docs.mjs && node scripts/check-docs-coverage.mjs && node --test scripts/check-docs.selftest.mjs && node scripts/check-upgrade-ledger.mjs && node scripts/check-state-surfaces.mjs && node scripts/check-steering-budget.mjs && node scripts/build-readme-counts.mjs --check && node scripts/build-stats-json.mjs --check && node scripts/build-adr-index.mjs --check && node scripts/count-consumer-usage.mjs --check && node scripts/build-design-md.mjs --check && node scripts/build-handoff.mjs --check && node scripts/generate-llms-txt.mjs --check && node scripts/figma-disposition.mjs --check && node scripts/figma-links.mjs --check && node scripts/check-figma-fallbacks.mjs && node scripts/check-figma-components.mjs --report && node scripts/check-guardrail-drift.mjs && node scripts/check-skills-lock.mjs && node scripts/check-lockfile-integrity.mjs && node scripts/check-skill-content.mjs',
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
    expect(expanded.test).toBe(pkg.scripts.test);
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

describe('readLaneScripts', () => {
  it('reads package.json scripts with lanes expanded, for tests that grep a chain', () => {
    const scripts = readLaneScripts(ROOT);
    expect(scripts.pretest).toBe(OLD_CHAINS.pretest);
    expect(scripts.test).toBe(pkg.scripts.test);
  });
});

// ralph/gate.sh's steps, exactly as the file ran them on main before hds#1095.
const OLD_RALPH_STEPS = [
  'pnpm manifest:generate',
  'node scripts/audit-tokens.mjs --full',
  'pnpm check:contrast',
  'pnpm check:focus',
  'pnpm check:colors',
  'pnpm check:motion',
  'pnpm typecheck',
  'node scripts/lib/test-lanes.mjs run',
  'pnpm lint',
];

describe('ralph-gate lane', () => {
  it('runs the same steps, in order, that ralph/gate.sh hard-coded', () => {
    expect(laneCommands(registry, 'ralph-gate')).toEqual(OLD_RALPH_STEPS);
  });

  it('ralph/gate.sh reads its steps from the lane and hard-codes none', () => {
    const gate = readFileSync(join(ROOT, 'ralph/gate.sh'), 'utf8');
    expect(gate).toContain('node scripts/run-lane.mjs ralph-gate --dry-run');
    expect(gate).not.toMatch(/^run_step (pnpm|node) /m);
  });

  /** A throwaway repo with ralph/gate.sh, the lane runner and `lane` as ralph-gate. */
  function gateRepo(lane) {
    const dir = mkdtempSync(join(tmpdir(), 'hds-ralph-lane-'));
    dirs.push(dir);
    mkdirSync(join(dir, 'ralph'));
    mkdirSync(join(dir, 'scripts/lib'), { recursive: true });
    mkdirSync(join(dir, 'docs/guardrails'), { recursive: true });
    cpSync(join(ROOT, 'ralph/gate.sh'), join(dir, 'ralph/gate.sh'));
    for (const f of [
      'run-lane.mjs',
      'lib/gate-lanes.mjs',
      'lib/guardrail-core.mjs',
      'lib/gate-scope.mjs',
    ])
      cpSync(join(ROOT, 'scripts', f), join(dir, 'scripts', f));
    const lanes = lane ? { 'ralph-gate': lane } : {};
    writeFileSync(join(dir, 'docs/guardrails/registry.json'), JSON.stringify({ lanes, gates: [] }));
    return spawnSync('bash', [join(dir, 'ralph/gate.sh')], { encoding: 'utf8' });
  }
  const dirs = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  it('runs each step, names it, and goes green when all pass', () => {
    const r = gateRepo(['echo one', 'echo two']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('── gate: echo one');
    expect(r.stdout).toContain('── gate: echo two');
    expect(r.stdout).toContain('── gate: all green');
  });

  it('fails closed at the first red step and names it', () => {
    const r = gateRepo(['echo one', 'false', 'echo three']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('── gate FAILED at: false');
    expect(r.stdout).not.toContain('three');
    expect(r.stdout).not.toContain('all green');
  });

  it('fails closed when the lane is missing', () => {
    const r = gateRepo(null);
    expect(r.status).not.toBe(0);
    expect(r.stdout).not.toContain('all green');
  });

  it('does not let a step swallow the remaining steps from stdin', () => {
    const r = gateRepo(['cat > /dev/null', 'echo after']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('── gate: echo after');
  });
});

describe('expandLaneCalls', () => {
  it('appends the commands of every lane a text calls, for wiring checks', () => {
    const reg = { lanes: { r: ['pnpm check:contrast', 'node a.mjs'] } };
    const out = expandLaneCalls('X="$(node scripts/run-lane.mjs r --dry-run)"', reg);
    expect(out).toContain('pnpm check:contrast\nnode a.mjs');
    expect(expandLaneCalls('no lanes here', reg)).toBe('no lanes here');
  });
});
