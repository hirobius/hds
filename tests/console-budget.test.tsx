/**
 * The console budget's own rules (hds#959), on a fixture component instead of
 * the docs demos: a new console.warn fails until it is allowlisted with an
 * issue and an upgrade ledger step, and the allowlist is generated the same
 * way every run.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import {
  budgetProblems,
  consoleCode,
  record,
  renderAllowlist,
  type Allowlist,
  type Seen,
} from './helpers/console-budget';

function Noisy({ id }: { id: number }) {
  console.warn('Noisy: prop "size" is deprecated (seen %s times)', id);
  return <span>noisy</span>;
}

function renderCollecting(demo: string, ui: React.ReactElement, seen: Seen) {
  const warn = vi
    .spyOn(console, 'warn')
    .mockImplementation((...a) => record(seen, demo, 'warn', a));
  const error = vi
    .spyOn(console, 'error')
    .mockImplementation((...a) => record(seen, demo, 'error', a));
  try {
    render(ui);
  } finally {
    warn.mockRestore();
    error.mockRestore();
    cleanup();
  }
}

const EMPTY: Allowlist = renderAllowlist(new Map());
const ledger = (ref: string) => ref === 'noisy-size-999';

afterEach(() => vi.restoreAllMocks());

describe('console budget', () => {
  it('codes drop values, numbers and stacks, so repeats are one code', () => {
    const a = consoleCode('warn', ['Noisy: prop "size" is 3 (x)\n    at Noisy (a.tsx:1:2)', 'B']);
    const b = consoleCode('warn', ["Noisy: prop 'tone' is 41 (x)"]);
    expect(a).toBe('warn: Noisy: prop * is N (x)');
    expect(b).toBe(a);
    expect(consoleCode('error', [new Error('Boom 7')])).toBe('error: Boom N');
  });

  it('fills %s slots, so one React template with two subjects is two codes', () => {
    const template = 'Warning: Failed %s type: %s%s';
    const size = consoleCode('error', [template, 'prop', 'Invalid prop size', '\n    at X']);
    const tone = consoleCode('error', [template, 'prop', 'Invalid prop tone', '\n    at X']);
    expect(size).toBe('error: Warning: Failed prop type: Invalid prop size');
    expect(tone).not.toBe(size);
  });

  it('keeps prose apostrophes, so they do not swallow text', () => {
    const a = consoleCode('warn', ["Don't pass size, it's gone"]);
    const b = consoleCode('warn', ["Don't pass tone, it's gone"]);
    expect(a).toBe("warn: Don't pass size, it's gone");
    expect(b).not.toBe(a);
  });

  it('fails on a new console.warn until it is allowlisted', () => {
    const seen: Seen = new Map();
    renderCollecting('Fixture', <Noisy id={1} />, seen);
    renderCollecting('Other', <Noisy id={2} />, seen);

    expect(budgetProblems(seen, EMPTY, ledger)).toEqual([
      'new console code (Fixture, Other): warn: Noisy: prop * is deprecated (seen N times)',
    ]);

    // Generated, but not yet filled in: still red.
    const generated = renderAllowlist(seen, EMPTY);
    expect(budgetProblems(seen, generated, ledger)).toEqual([
      'no issue (hirobius/hds#N) for: warn: Noisy: prop * is deprecated (seen N times)',
      'no upgrade ledger step "" for: warn: Noisy: prop * is deprecated (seen N times)',
    ]);

    const filled: Allowlist = {
      ...generated,
      codes: generated.codes.map((e) => ({
        ...e,
        issue: 'hirobius/hds#999',
        upgrade: 'noisy-size-999',
      })),
    };
    expect(budgetProblems(seen, filled, ledger)).toEqual([]);
    // A step the ledger does not hold does not count.
    expect(budgetProblems(seen, filled, () => false)).toHaveLength(1);
  });

  it('flags an allowlisted code the demos stopped printing', () => {
    const seen: Seen = new Map([['warn: gone', new Set(['A'])]]);
    const list: Allowlist = {
      ...renderAllowlist(seen),
      codes: [
        { code: 'warn: gone', demos: ['A'], issue: 'hirobius/hds#1', upgrade: 'noisy-size-999' },
      ],
    };
    expect(budgetProblems(new Map(), list, ledger)).toEqual([
      'allowlisted code no longer printed: warn: gone',
    ]);
  });

  it('generates the same allowlist whatever order the calls came in', () => {
    const one: Seen = new Map();
    record(one, 'B', 'warn', ['b']);
    record(one, 'A', 'error', ['a']);
    record(one, 'C', 'warn', ['b']);
    const two: Seen = new Map();
    record(two, 'C', 'warn', ['b']);
    record(two, 'A', 'error', ['a']);
    record(two, 'B', 'warn', ['b']);
    expect(JSON.stringify(renderAllowlist(one))).toBe(JSON.stringify(renderAllowlist(two)));
    expect(renderAllowlist(one).codes.map((e) => [e.code, e.demos])).toEqual([
      ['error: a', ['A']],
      ['warn: b', ['B', 'C']],
    ]);
  });
});
