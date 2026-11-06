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
  expandHookLanes,
  expandLaneCalls,
  expandLaneScripts,
  laneCommands,
  laneStages,
  readLaneScripts,
  runLane,
} from '../lib/gate-lanes.mjs';
import { parseHookStages } from '../lib/hook-output.mjs';

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
    'node scripts/validate-manifest.mjs && node scripts/check-manifest-drift.mjs && node scripts/check-manifest-schema-semver.mjs && node scripts/audit-component-integrity.mjs --completeness && node scripts/audit-component-integrity.mjs --api && node scripts/check-ref-forwarding.mjs && node scripts/check-source-canon.mjs && node scripts/check-binding-drift.mjs && node scripts/check-component-token-binding.mjs --report && node scripts/check-tenant-tokens.mjs && node scripts/check-tailwind-spacing-scale.mjs --ratchet && node scripts/check-props-exports.mjs && knip --no-exit-code && node scripts/check-dark-alias-flip.mjs && node scripts/check-focus-states.mjs && node scripts/check-no-status-clutter.mjs && node scripts/generate-consumer-skill.mjs --check && node scripts/check-version-stamps.mjs && node scripts/generate-agents-md.mjs --check && node scripts/check-llms-txt.mjs && node scripts/check-deprecations.mjs && node scripts/build-deprecations.mjs --check && node scripts/upgrade/schema.mjs --check && node scripts/upgrade/compile.mjs --check && node scripts/build-utility-safelist.mjs --check && node scripts/check-docs.mjs && node scripts/check-docs-coverage.mjs && node --test scripts/check-docs.selftest.mjs && node scripts/check-upgrade-ledger.mjs && node scripts/check-state-surfaces.mjs && node scripts/check-steering-budget.mjs && node scripts/build-readme-counts.mjs --check && node scripts/build-stats-json.mjs --check && node scripts/build-adr-index.mjs --check && node scripts/count-consumer-usage.mjs --check && node scripts/build-design-md.mjs --check && node scripts/build-handoff.mjs --check && node scripts/generate-llms-txt.mjs --check && node scripts/figma-disposition.mjs --check && node scripts/figma-links.mjs --check && node scripts/check-figma-coverage.mjs && node scripts/check-figma-fallbacks.mjs && node scripts/check-figma-components.mjs --report && node scripts/check-guardrail-drift.mjs && node scripts/check-skills-lock.mjs && node scripts/check-lockfile-integrity.mjs && node scripts/check-skill-content.mjs',
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

// .husky/pre-push's stages, exactly as the hook listed them on main before
// the pre-push lane (hds#1095): the echo title, then the one command under it.
const OLD_PRE_PUSH_STAGES = [
  [
    'Secret + PII scan (pushed commits; fails closed without gitleaks)',
    'node scripts/hooks/secret-pii-scan.mjs',
  ],
  [
    'Record freshness (status.json + changeset presence)',
    'node scripts/check-record-freshness.mjs',
  ],
  ['TDD gate (source changes ship with a test)', 'node scripts/check-tests-with-code.mjs'],
  [
    'Tiered gate (docs: none · fast: lint + typecheck + related tests · full: check:fast + affected tests + smoke)',
    'node scripts/pre-push-gate.mjs',
  ],
];

describe('pre-push lane', () => {
  const hook = readFileSync(join(ROOT, '.husky/pre-push'), 'utf8');

  it('holds the stages .husky/pre-push hard-coded, in order', () => {
    expect(laneStages(registry, 'pre-push')).toEqual(
      OLD_PRE_PUSH_STAGES.map(([title, run]) => ({ title, run })),
    );
    expect(laneCommands(registry, 'pre-push')).toEqual(OLD_PRE_PUSH_STAGES.map(([, run]) => run));
  });

  it('the hook calls the lane and hard-codes no stage', () => {
    expect(hook).toMatch(/^node scripts\/run-lane\.mjs pre-push$/m);
    expect(parseHookStages(hook)).toEqual([]);
  });

  it('expanding the hook gives hook-run the exact old stages', () => {
    const stages = parseHookStages(expandHookLanes(hook, registry));
    expect(stages.map((s) => [s.title, ...s.commands])).toEqual(OLD_PRE_PUSH_STAGES);
    expect(stages.map((s) => s.name)).toEqual([
      'secret-pii-scan',
      'record-freshness',
      'tests-with-code',
      'pre-push-gate',
    ]);
  });
});

describe('laneStages', () => {
  it('titles a plain command step with the command itself', () => {
    const reg = { lanes: { a: ['node x.mjs', { name: 'Why', run: 'pnpm y' }] } };
    expect(laneStages(reg, 'a')).toEqual([
      { title: 'node x.mjs', run: 'node x.mjs' },
      { title: 'Why', run: 'pnpm y' },
    ]);
    expect(laneCommands(reg, 'a')).toEqual(['node x.mjs', 'pnpm y']);
    expect(laneStages(reg, 'zzz')).toBeNull();
  });
});

describe('expandHookLanes', () => {
  const reg = { lanes: { p: [{ name: 'One', run: 'node a.mjs' }, 'pnpm b'] } };

  it('replaces a lane call line with one echo stage per step', () => {
    const text = 'set -e\n# note\n  node scripts/run-lane.mjs p\n';
    expect(expandHookLanes(text, reg)).toBe(
      'set -e\n# note\necho "One…"\nnode a.mjs\necho "pnpm b…"\npnpm b\n',
    );
  });

  it('leaves text without a lane call, or calling an unknown lane, untouched', () => {
    expect(expandHookLanes('echo "A…"\nnode a.mjs\n', reg)).toBe('echo "A…"\nnode a.mjs\n');
    const unknown = 'node scripts/run-lane.mjs nope\n';
    expect(expandHookLanes(unknown, reg)).toBe(unknown);
  });
});

describe('hook-run.mjs runs a lane-backed hook stage by stage', () => {
  const dirs = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  /** A git repo with the real .husky/pre-push and `lane` as its pre-push lane. */
  function hookRepo(lane, env = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'hds-hook-lane-'));
    dirs.push(dir);
    spawnSync('git', ['init', '-q'], { cwd: dir });
    mkdirSync(join(dir, '.husky'));
    mkdirSync(join(dir, 'scripts/lib'), { recursive: true });
    mkdirSync(join(dir, 'docs/guardrails'), { recursive: true });
    cpSync(join(ROOT, '.husky/pre-push'), join(dir, '.husky/pre-push'));
    for (const f of [
      'run-lane.mjs',
      'lib/gate-lanes.mjs',
      'lib/guardrail-core.mjs',
      'lib/gate-scope.mjs',
    ])
      cpSync(join(ROOT, 'scripts', f), join(dir, 'scripts', f));
    writeFileSync(
      join(dir, 'docs/guardrails/registry.json'),
      JSON.stringify({ lanes: lane ? { 'pre-push': lane } : {}, gates: [] }),
    );
    return spawnSync('node', [join(ROOT, 'scripts/hook-run.mjs'), 'pre-push'], {
      cwd: dir,
      input: 'refs/heads/x 1 refs/heads/x 2\n',
      encoding: 'utf8',
      env: { ...process.env, HOOK_VERBOSE: '', ...env },
    });
  }

  it('names each stage in the summary and feeds git stdin to every stage', () => {
    const r = hookRepo([
      { name: 'Read stdin', run: 'grep -q refs/heads/x' },
      { name: 'Two', run: 'node -e 0' },
    ]);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/✓ pre-push: grep, node \(/);
  });

  it('stops at the first red stage with its exit code and names it', () => {
    const r = hookRepo([
      { name: 'One', run: 'node -e 0' },
      { name: 'Two', run: 'node -e "process.exit(4)"' },
      { name: 'Three', run: 'touch three' },
    ]);
    expect(r.status).toBe(4);
    expect(r.stderr).toMatch(/pre-push: node failed \(exit 4\)/);
  });

  it('fails closed when the lane is missing', () => {
    const r = hookRepo(null);
    expect(r.status).not.toBe(0);
  });

  it('HOOK_VERBOSE=1 runs the hook file raw through run-lane, titles shown', () => {
    const r = hookRepo(
      [
        { name: 'Read stdin', run: 'grep -q refs/heads/x' },
        { name: 'Fails', run: 'exit 3' },
        { name: 'Never', run: 'echo never' },
      ],
      { HOOK_VERBOSE: '1' },
    );
    expect(r.status).toBe(3);
    expect(r.stdout).toContain('Read stdin…');
    expect(r.stdout).toContain('Fails…');
    expect(r.stdout).not.toContain('never');
  });
});
