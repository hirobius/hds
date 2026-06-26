/**
 * Tests for scripts/loop/orchestration-lib.mjs — the deterministic core of the
 * HDS autonomous loop. The whole point of loop engineering is that the harness
 * around the stochastic agent is itself provably correct, so these cover the
 * verifier contract, selection ordering, and transition legality.
 */

import { describe, it, expect } from 'vitest';
import {
  parseCheck,
  checkToCommand,
  validateContract,
  selectNextUnit,
  applyTransition,
  summarize,
  PNPM_VERIFIERS,
} from '../loop/orchestration-lib.mjs';

const GATES = new Set(['check-deprecations', 'check-no-style-prop']);

function orch(units, extra = {}) {
  return { version: 1, concurrency: 1, budget: { maxAttempts: 2 }, units, ...extra };
}

describe('parseCheck / checkToCommand', () => {
  it('parses the gate: and pnpm: DSL', () => {
    expect(parseCheck('gate:check-deprecations')).toEqual({
      kind: 'gate',
      ref: 'check-deprecations',
    });
    expect(parseCheck('pnpm:typecheck')).toEqual({ kind: 'pnpm', ref: 'typecheck' });
  });
  it('flags anything else as invalid', () => {
    expect(parseCheck('typecheck').kind).toBe('invalid');
    expect(parseCheck('').kind).toBe('invalid');
    expect(parseCheck(42).kind).toBe('invalid');
  });
  it('resolves to a runnable command', () => {
    expect(checkToCommand('gate:check-deprecations')).toBe(
      'node scripts/run-gates.mjs --gate check-deprecations',
    );
    expect(checkToCommand('pnpm:test:a11y')).toBe('pnpm test:a11y');
    expect(checkToCommand('bogus')).toBeNull();
  });
  it('test:a11y-style multi-colon refs survive the split', () => {
    expect(parseCheck('pnpm:test:a11y')).toEqual({ kind: 'pnpm', ref: 'test:a11y' });
    expect(PNPM_VERIFIERS.has('test:a11y')).toBe(true);
  });
});

describe('validateContract — the verifier contract', () => {
  it('passes when every autonomous unit has a resolvable check', () => {
    const o = orch([
      { id: 'a', status: 'backlog', acceptanceChecks: ['pnpm:typecheck'] },
      { id: 'b', status: 'backlog', acceptanceChecks: ['gate:check-deprecations'] },
    ]);
    expect(validateContract(o, GATES).ok).toBe(true);
  });

  it('rejects an autonomous unit with NO acceptance checks', () => {
    const o = orch([{ id: 'a', status: 'backlog', acceptanceChecks: [] }]);
    const r = validateContract(o, GATES);
    expect(r.ok).toBe(false);
    expect(r.violations[0].reason).toMatch(/no acceptanceChecks/);
  });

  it('rejects a check that does not resolve to a known gate or pnpm verifier', () => {
    const o = orch([{ id: 'a', status: 'backlog', acceptanceChecks: ['gate:does-not-exist'] }]);
    expect(validateContract(o, GATES).ok).toBe(false);
    const o2 = orch([{ id: 'a', status: 'backlog', acceptanceChecks: ['pnpm:deploy'] }]);
    expect(validateContract(o2, GATES).ok).toBe(false);
  });

  it('does NOT require checks for human-only or done units', () => {
    const o = orch([
      { id: 'h', status: 'human-only', humanOnly: true, acceptanceChecks: [] },
      { id: 'd', status: 'done', acceptanceChecks: [] },
    ]);
    expect(validateContract(o, GATES).ok).toBe(true);
  });

  it('flags invalid status and duplicate ids', () => {
    const o = orch([
      { id: 'x', status: 'weird', acceptanceChecks: ['pnpm:typecheck'] },
      { id: 'x', status: 'backlog', acceptanceChecks: ['pnpm:typecheck'] },
    ]);
    const reasons = validateContract(o, GATES).violations.map((v) => v.reason);
    expect(reasons.some((r) => /invalid status/.test(r))).toBe(true);
    expect(reasons.some((r) => /duplicate/.test(r))).toBe(true);
  });
});

describe('selectNextUnit', () => {
  it('returns the highest-priority eligible backlog unit', () => {
    const o = orch([
      { id: 'low', status: 'backlog', priority: 'P3', acceptanceChecks: ['pnpm:typecheck'] },
      { id: 'high', status: 'backlog', priority: 'P0', acceptanceChecks: ['pnpm:typecheck'] },
    ]);
    expect(selectNextUnit(o, GATES).unit.id).toBe('high');
  });

  it('skips human-only, done, attempts-exhausted, and unresolvable units', () => {
    const o = orch([
      { id: 'human', status: 'human-only', humanOnly: true, priority: 'P0', acceptanceChecks: [] },
      { id: 'done', status: 'done', priority: 'P0', acceptanceChecks: ['pnpm:typecheck'] },
      {
        id: 'exhausted',
        status: 'backlog',
        priority: 'P0',
        attempts: 2,
        acceptanceChecks: ['pnpm:typecheck'],
      },
      { id: 'bad-gate', status: 'backlog', priority: 'P0', acceptanceChecks: ['gate:nope'] },
      { id: 'ok', status: 'backlog', priority: 'P1', acceptanceChecks: ['pnpm:typecheck'] },
    ]);
    expect(selectNextUnit(o, GATES).unit.id).toBe('ok');
  });

  it('respects the concurrency cap', () => {
    const o = orch(
      [
        { id: 'claimed', status: 'claimed', priority: 'P0', acceptanceChecks: ['pnpm:typecheck'] },
        { id: 'waiting', status: 'backlog', priority: 'P0', acceptanceChecks: ['pnpm:typecheck'] },
      ],
      { concurrency: 1 },
    );
    const r = selectNextUnit(o, GATES);
    expect(r.unit).toBeNull();
    expect(r.reason).toMatch(/concurrency/);
  });

  it('returns null with a reason when nothing is eligible', () => {
    const o = orch([{ id: 'h', status: 'human-only', humanOnly: true, acceptanceChecks: [] }]);
    expect(selectNextUnit(o, GATES).unit).toBeNull();
  });
});

describe('applyTransition', () => {
  it('moves backlog → claimed without mutating the input', () => {
    const o = orch([
      { id: 'a', status: 'backlog', attempts: 0, acceptanceChecks: ['pnpm:typecheck'] },
    ]);
    const next = applyTransition(o, 'a', 'claimed', { attempts: 1 });
    expect(next.units[0].status).toBe('claimed');
    expect(next.units[0].attempts).toBe(1);
    expect(o.units[0].status).toBe('backlog'); // original untouched
  });

  it('allows claimed → done and claimed → parked', () => {
    const o = orch([{ id: 'a', status: 'claimed', acceptanceChecks: ['pnpm:typecheck'] }]);
    expect(applyTransition(o, 'a', 'done').units[0].status).toBe('done');
    expect(applyTransition(o, 'a', 'parked').units[0].status).toBe('parked');
  });

  it('throws on an illegal transition (backlog → done)', () => {
    const o = orch([{ id: 'a', status: 'backlog', acceptanceChecks: ['pnpm:typecheck'] }]);
    expect(() => applyTransition(o, 'a', 'done')).toThrow(/illegal transition/);
  });

  it('throws on an unknown unit', () => {
    const o = orch([{ id: 'a', status: 'backlog', acceptanceChecks: ['pnpm:typecheck'] }]);
    expect(() => applyTransition(o, 'ghost', 'claimed')).toThrow(/unknown unit/);
  });
});

describe('summarize', () => {
  it('counts units by status', () => {
    const o = orch([
      { id: 'a', status: 'backlog', acceptanceChecks: ['pnpm:typecheck'] },
      { id: 'b', status: 'done', acceptanceChecks: [] },
      { id: 'c', status: 'human-only', humanOnly: true, acceptanceChecks: [] },
    ]);
    const s = summarize(o);
    expect(s.total).toBe(3);
    expect(s.counts.backlog).toBe(1);
    expect(s.counts.done).toBe(1);
    expect(s.counts['human-only']).toBe(1);
  });
});

describe('the seeded orchestration.json satisfies its own contract', () => {
  it('loads and validates against the live registry', async () => {
    const {
      loadOrchestration,
      loadRegistryGateIds,
      validateContract: vc,
    } = await import('../loop/orchestration-lib.mjs');
    const o = loadOrchestration();
    const gateIds = loadRegistryGateIds();
    const r = vc(o, gateIds);
    if (!r.ok) console.error(r.violations);
    expect(r.ok).toBe(true);
  });
});
