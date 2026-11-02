/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for groupByRule and emitViolationsJson in scripts/lib/source-scan.mjs
 * (hds#1010): shared by check-style-discipline and check-typography-discipline.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { groupByRule, emitViolationsJson } from '../lib/source-scan.mjs';

afterEach(() => vi.restoreAllMocks());

describe('groupByRule', () => {
  it('groups violations by rule, keeping first-seen rule order and item order', () => {
    const a1 = { rule: 'a', line: 1 };
    const b1 = { rule: 'b', line: 2 };
    const a2 = { rule: 'a', line: 3 };
    const g = groupByRule([a1, b1, a2]);
    expect([...g.keys()]).toEqual(['a', 'b']);
    expect(g.get('a')).toEqual([a1, a2]);
    expect(g.get('b')).toEqual([b1]);
  });
});

describe('emitViolationsJson', () => {
  function captureJson(violations) {
    const out = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => (out.push(s), true));
    vi.spyOn(console, 'log').mockImplementation((s) => out.push(s));
    const code = emitViolationsJson(violations);
    return { code, json: JSON.parse(out.join('')) };
  }

  it('emits violations unchanged with a total and returns 1 when any', () => {
    const v = { file: 'a.tsx', line: 2, rule: 'r', severity: 'warn', message: 'm', tag: 'div' };
    const r = captureJson([v]);
    expect(r.code).toBe(1);
    expect(r.json).toMatchObject({ violations: [v], summary: { total: 1 }, ok: false });
  });

  it('returns 0 and ok:true when clean', () => {
    const r = captureJson([]);
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ violations: [], summary: { total: 0 }, ok: true });
  });
});
