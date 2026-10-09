/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/run-size-limit.mjs — thin wrapper around `size-limit` so a bundle
 * budget failure names the performance-optimization skill (Osmani, required for
 * perf-budget failures) and says never to raise the budget. The wrapper is the
 * `size-limit` package script, so CI's `pnpm size-limit` step prints it too.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERF_BUDGET_HINT } from '../lib/perf-budget-hint.mjs';
import { runSizeLimit } from '../run-size-limit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('PERF_BUDGET_HINT', () => {
  it('names the skill and forbids raising the budget', () => {
    expect(PERF_BUDGET_HINT).toContain('performance-optimization');
    expect(PERF_BUDGET_HINT).toContain('.claude/skills/performance-optimization/SKILL.md');
    expect(PERF_BUDGET_HINT).toMatch(/do not raise/i);
  });
});

describe('runSizeLimit', () => {
  it('passes the exit code through and prints nothing extra when size-limit passes', () => {
    const spawn = vi.fn().mockReturnValue({ status: 0 });
    const err = vi.fn();
    expect(runSizeLimit(['--json'], { spawn, err })).toBe(0);
    expect(spawn).toHaveBeenCalledWith(
      expect.stringMatching(/size-limit/),
      ['--config', '.size-limit.cjs', '--json'],
      expect.objectContaining({ stdio: 'inherit' }),
    );
    expect(err).not.toHaveBeenCalled();
  });

  it('prints the skill hint and keeps the non-zero exit code when size-limit fails', () => {
    const spawn = vi.fn().mockReturnValue({ status: 1 });
    const err = vi.fn();
    expect(runSizeLimit([], { spawn, err })).toBe(1);
    expect(err.mock.calls.join('\n')).toContain('performance-optimization');
  });

  it('fails (non-zero) with the hint when size-limit cannot be spawned', () => {
    const spawn = vi.fn().mockReturnValue({ status: null, error: new Error('ENOENT') });
    const err = vi.fn();
    expect(runSizeLimit([], { spawn, err })).not.toBe(0);
  });
});

describe('wiring', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  it('the size-limit and check:size package scripts go through the wrapper', () => {
    expect(pkg.scripts['size-limit']).toBe('node scripts/run-size-limit.mjs');
    expect(pkg.scripts['check:size']).toContain('pnpm size-limit');
    expect(pkg.scripts['check:size']).not.toMatch(/&& size-limit$/);
  });
  it('build-button-probe failure output uses the shared hint', () => {
    const src = readFileSync(path.join(ROOT, 'scripts', 'build-button-probe.mjs'), 'utf8');
    expect(src).toContain('PERF_BUDGET_HINT');
  });
  it('.size-limit.cjs budgets point at the skill in their header', () => {
    const src = readFileSync(path.join(ROOT, '.size-limit.cjs'), 'utf8');
    expect(src).toContain('performance-optimization');
  });
});
