import { describe, expect, it } from 'vitest';
import { BLOCKING_IMPACTS, evaluateScan, validateAllowlist } from '../lib/axe-gate.mjs';

const v = (id, impact, nodes = 1) => ({ id, impact, nodes });
const scan = (storyId, theme, violations = [], error = null) => ({
  storyId,
  theme,
  violations,
  error,
});
const entry = (storyId, ruleId) => ({
  storyId,
  ruleId,
  reason: 'tracked in #311',
  addedOn: '2026-09-29',
});

describe('axe gate: classification', () => {
  it('blocks only serious and critical', () => {
    expect(BLOCKING_IMPACTS).toEqual(['serious', 'critical']);
    const r = evaluateScan(
      [
        scan('a--x', 'light', [
          v('r1', 'minor'),
          v('r2', 'moderate'),
          v('r3', 'serious'),
          v('r4', 'critical'),
        ]),
      ],
      [],
    );
    expect(r.blocking.map((b) => b.ruleId)).toEqual(['r3', 'r4']);
    expect(r.ok).toBe(false);
  });

  it('passes a clean scan', () => {
    const r = evaluateScan([scan('a--x', 'light'), scan('a--x', 'dark')], []);
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(2);
  });

  it('treats a story that failed to render as a failure', () => {
    const r = evaluateScan([scan('a--x', 'dark', [], 'timeout')], []);
    expect(r.errored).toHaveLength(1);
    expect(r.ok).toBe(false);
  });
});

describe('axe gate: allowlist', () => {
  it('moves an allowlisted violation out of blocking, in either theme', () => {
    const r = evaluateScan(
      [
        scan('a--x', 'light', [v('color-contrast', 'serious')]),
        scan('a--x', 'dark', [v('color-contrast', 'serious')]),
      ],
      [entry('a--x', 'color-contrast')],
    );
    expect(r.blocking).toEqual([]);
    expect(r.allowed).toHaveLength(2);
    expect(r.ok).toBe(true);
  });

  it('does not let an entry cover a different rule or story', () => {
    const r = evaluateScan(
      [
        scan('a--x', 'light', [v('label', 'critical')]),
        scan('b--y', 'light', [v('color-contrast', 'serious')]),
      ],
      [entry('a--x', 'color-contrast')],
    );
    expect(r.blocking.map((b) => `${b.storyId}:${b.ruleId}`)).toEqual([
      'a--x:label',
      'b--y:color-contrast',
    ]);
  });

  it('fails on an entry that matches nothing (cannot rot)', () => {
    const r = evaluateScan([scan('a--x', 'light')], [entry('a--x', 'color-contrast')]);
    expect(r.stale).toEqual([entry('a--x', 'color-contrast')]);
    expect(r.ok).toBe(false);
  });

  it('does not count a minor violation as a match for an entry', () => {
    const r = evaluateScan(
      [scan('a--x', 'light', [v('color-contrast', 'minor')])],
      [entry('a--x', 'color-contrast')],
    );
    expect(r.stale).toHaveLength(1);
  });

  it('rejects malformed entries', () => {
    expect(validateAllowlist([entry('a', 'b')])).toEqual([]);
    expect(validateAllowlist([{ storyId: 'a', ruleId: 'b' }])[0]).toMatch(/reason/);
    expect(validateAllowlist([{ ...entry('a', 'b'), extra: 1 }])[0]).toMatch(/extra/);
    expect(validateAllowlist([entry('a', 'b'), entry('a', 'b')])[0]).toMatch(/duplicate/);
    expect(validateAllowlist({})[0]).toMatch(/array/);
  });
});
