/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/guardrail-sweep.mjs.
 *
 * The behaviour worth pinning is the FAIL/CRASH split. Reading a gate that dies
 * on startup as "a gate reporting violations" is how audit-bundle stayed red
 * and unnoticed, and it is the failure the deleted telemetry could never have
 * caught either (ADR-027).
 */

import { describe, it, expect } from 'vitest';
import { classifyVerdict, summarize, exitCodeFor, ACTIONABLE } from '../lib/guardrail-sweep.mjs';

describe('classifyVerdict', () => {
  it('reads exit 0 as a pass and exit 1 as real violations', () => {
    expect(classifyVerdict({ status: 0 })).toBe('PASS');
    expect(classifyVerdict({ status: 1 })).toBe('FAIL');
  });

  it('reads exit 2 as no-data, not a violation', () => {
    // check-figma-drift exits 2 when no snapshot is committed. The gate ran and
    // correctly declined to render a verdict; counting that as a violation
    // would put a permanent red row next to gates that found real problems.
    expect(classifyVerdict({ status: 2 })).toBe('NO-DATA');
  });

  it('separates a gate that crashed from a gate that found violations', () => {
    expect(classifyVerdict({ status: 7 })).toBe('CRASH');
    expect(classifyVerdict({ status: null })).toBe('CRASH');
  });

  it('reads a timeout from the spawn error, not the status', () => {
    expect(classifyVerdict({ status: null, error: { code: 'ETIMEDOUT' } })).toBe('TIMEOUT');
  });
});

describe('summarize', () => {
  const results = [
    { id: 'a', verdict: 'PASS', durationMs: 50, dirtiesTree: false },
    { id: 'b', verdict: 'FAIL', durationMs: 60, dirtiesTree: false },
    { id: 'c', verdict: 'CRASH', durationMs: 1600, dirtiesTree: false },
    { id: 'slow-one', verdict: 'PASS', durationMs: 48_000, dirtiesTree: true },
    { id: 'dirty-one', verdict: 'PASS', durationMs: 300, dirtiesTree: true },
  ];

  it('counts each verdict and the actionable subset', () => {
    const s = summarize(results);
    expect(s.total).toBe(5);
    expect(s.byVerdict).toEqual({ PASS: 3, FAIL: 1, CRASH: 1 });
    expect(s.actionable).toBe(2); // FAIL + CRASH
  });

  it('names the gates that rewrite the working tree', () => {
    // These can never be wired to pre-commit as-is: they would leave the tree
    // permanently modified after every commit.
    expect(summarize(results).dirtiesTree).toEqual(['slow-one', 'dirty-one']);
  });

  it('names the gates too slow for a commit hook', () => {
    expect(summarize(results).slow).toEqual(['slow-one']);
    expect(summarize(results, { slowMs: 100 }).slow).toEqual(['c', 'slow-one', 'dirty-one']);
  });

  it('treats NO-DATA as actionable — an unanswerable gate still needs a human', () => {
    expect(ACTIONABLE).toContain('NO-DATA');
    const s = summarize([{ id: 'x', verdict: 'NO-DATA', durationMs: 10, dirtiesTree: false }]);
    expect(s.actionable).toBe(1);
  });
});

describe('exitCodeFor', () => {
  it('does NOT fail on violations — a sweep is a report', () => {
    const s = summarize([{ id: 'a', verdict: 'FAIL', durationMs: 1, dirtiesTree: false }]);
    expect(exitCodeFor(s)).toBe(0);
  });

  it('fails when a gate could not run at all', () => {
    for (const verdict of ['CRASH', 'TIMEOUT']) {
      const s = summarize([{ id: 'a', verdict, durationMs: 1, dirtiesTree: false }]);
      expect(exitCodeFor(s)).toBe(1);
    }
  });

  it('fails on any actionable verdict under --strict', () => {
    const s = summarize([{ id: 'a', verdict: 'FAIL', durationMs: 1, dirtiesTree: false }]);
    expect(exitCodeFor(s, { strict: true })).toBe(1);
  });

  it('passes a fully green sweep either way', () => {
    const s = summarize([{ id: 'a', verdict: 'PASS', durationMs: 1, dirtiesTree: false }]);
    expect(exitCodeFor(s)).toBe(0);
    expect(exitCodeFor(s, { strict: true })).toBe(0);
  });
});
