/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for reportLineViolations in scripts/lib/source-scan.mjs (hds#1010):
 * the shared human/JSON report for line-scoped gates.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { reportLineViolations, isFixtureRun } from '../lib/source-scan.mjs';

const opts = {
  gate: 'check-x',
  ok: 'all good',
  noun: (n) => `thing${n === 1 ? '' : 's'}:`,
  fix: ['\nFix: do it.', '  Exempt a line.\n'],
};
const v = { file: 'a.css', line: 3, col: 1, rule: 'r', message: 'bad', sample: 'x: 1' };

function capture(fn) {
  const out = [];
  const err = [];
  vi.spyOn(console, 'log').mockImplementation((s) => out.push(s));
  vi.spyOn(console, 'error').mockImplementation((s) => err.push(s));
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => (out.push(s), true));
  const code = fn();
  return { out, err, code };
}

afterEach(() => vi.restoreAllMocks());

describe('reportLineViolations', () => {
  it('prints a file-level violation (no line, no sample) without them', () => {
    const fileLevel = { file: 'tokens.json', line: null, rule: 'r', message: 'bad' };
    const r = capture(() => reportLineViolations([fileLevel], false, opts));
    expect(r.code).toBe(1);
    expect(r.err).toEqual([
      '\n✗ check-x: 1 thing:\n',
      '  tokens.json  [r] bad',
      '\nFix: do it.',
      '  Exempt a line.\n',
    ]);
  });
  it('prints the ok line and returns 0 when clean', () => {
    const r = capture(() => reportLineViolations([], false, opts));
    expect(r.code).toBe(0);
    expect(r.out).toEqual(['[ok] check-x: all good']);
  });
  it('prints headline, each violation and the fix lines, returning 1', () => {
    const r = capture(() => reportLineViolations([v], false, opts));
    expect(r.code).toBe(1);
    expect(r.err).toEqual([
      '\n✗ check-x: 1 thing:\n',
      '  a.css:3  [r] bad',
      '    x: 1',
      '\nFix: do it.',
      '  Exempt a line.\n',
    ]);
  });
  it('carries per-violation extra fields into JSON, between message and sample', () => {
    const withExtra = { ...v, extra: { prop: 'gap', value: '16px' } };
    const r = capture(() => reportLineViolations([withExtra], true, opts));
    expect(r.code).toBe(1);
    const [entry] = JSON.parse(r.out.join('')).violations;
    expect(Object.keys(entry)).toEqual([
      'file',
      'line',
      'rule',
      'severity',
      'message',
      'prop',
      'value',
      'sample',
    ]);
    expect(entry.prop).toBe('gap');
    expect(entry.value).toBe('16px');
  });
  it('emits the canonical JSON shape in json mode', () => {
    const r = capture(() => reportLineViolations([v], true, opts));
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out.join(''))).toEqual({
      violations: [
        { file: 'a.css', line: 3, rule: 'r', severity: 'error', message: 'bad', sample: 'x: 1' },
      ],
      summary: { total: 1 },
      ok: false,
    });
  });
});

describe('isFixtureRun', () => {
  it('reads the flag or the env var', () => {
    expect(isFixtureRun(['node', 'x', '--fixture-mode'], {})).toBe(true);
    expect(isFixtureRun(['node', 'x'], { HDS_FIXTURE_MODE: '1' })).toBe(true);
    expect(isFixtureRun(['node', 'x'], {})).toBe(false);
  });
});
