/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
//
// check-steering-budget (hds#612, ported from ops#292). Seams: evaluateBudget
// (the arithmetic) and the CLI, which reads docs/guardrails/steering-budget.json
// under FIXTURE_DIR (or the repo) and reports over-budget or missing files.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateBudget } from '../lib/steering-budget.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts/check-steering-budget.mjs');
const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

function mini(files, manifest) {
  const root = mkdtempSync(join(tmpdir(), 'steering-'));
  temps.push(root);
  for (const [rel, text] of Object.entries(files)) writeFileSync(join(root, rel), text);
  mkdirSync(join(root, 'docs/guardrails'), { recursive: true });
  writeFileSync(join(root, 'docs/guardrails/steering-budget.json'), JSON.stringify(manifest));
  return root;
}
const run = (root, args = []) => {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], {
      env: { ...process.env, FIXTURE_DIR: root },
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { status: 0, stdout };
  } catch (e) {
    return { status: e.status, stdout: e.stdout, stderr: e.stderr };
  }
};

describe('evaluateBudget', () => {
  it('passes at exactly the budget', () => {
    expect(evaluateBudget({ maxTotalBytes: 10, sizes: { a: 4, b: 6 } })).toMatchObject({
      total: 10,
      over: 0,
      violations: [],
    });
  });

  it('fails one byte over, naming the largest file and the fix', () => {
    const { violations, over } = evaluateBudget({ maxTotalBytes: 10, sizes: { a: 4, b: 7 } });
    expect(over).toBe(1);
    expect(violations).toHaveLength(1);
    expect(violations[0].detail).toContain('Largest contributor: b');
    expect(violations[0].detail).toContain('on-demand');
  });

  it('fails a missing file', () => {
    const { violations } = evaluateBudget({ maxTotalBytes: 10, sizes: { a: null } });
    expect(violations[0].id).toBe('missing-a');
  });
});

describe('CLI', () => {
  it('exits 0 within budget and 1 over it', () => {
    const files = { 'A.md': 'x'.repeat(100) };
    expect(run(mini(files, { maxTotalBytes: 100, files: ['A.md'] })).status).toBe(0);
    const over = run(mini(files, { maxTotalBytes: 99, files: ['A.md'] }));
    expect(over.status).toBe(1);
    expect(over.stderr).toContain('always-on agent context');
  });

  it('exits 1 for a listed file that is gone', () => {
    expect(run(mini({}, { maxTotalBytes: 100, files: ['A.md'] })).status).toBe(1);
  });

  it('emits { violations } with --json', () => {
    const res = run(mini({ 'A.md': 'xxxx' }, { maxTotalBytes: 1, files: ['A.md'] }), ['--json']);
    expect(res.status).toBe(1);
    expect(JSON.parse(res.stdout).violations[0].id).toBe('steering-budget-exceeded');
  });
});

describe('this repo', () => {
  it('stays within its committed budget, and lists the same files as the state-surface alwaysOn', () => {
    expect(run(ROOT).status).toBe(0);
    const budget = JSON.parse(
      readFileSync(join(ROOT, 'docs/guardrails/steering-budget.json'), 'utf8'),
    );
    const surfaces = JSON.parse(readFileSync(join(ROOT, 'docs/state-surfaces.json'), 'utf8'));
    expect([...budget.files].sort()).toEqual([...surfaces.alwaysOn].sort());
  });
});
