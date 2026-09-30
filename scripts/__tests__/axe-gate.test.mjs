import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BLOCKING_IMPACTS,
  evaluateScan,
  loadAxeSource,
  validateAllowlist,
} from '../lib/axe-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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

describe('axe gate: stories that pin a theme', () => {
  it('reports a skipped pass without failing the gate or counting it as an error', () => {
    const r = evaluateScan(
      [
        {
          storyId: 'patterns-destructivesection--dark',
          theme: 'light',
          violations: [],
          error: null,
          skipped: 'story pins theme dark via globals',
        },
        {
          storyId: 'patterns-destructivesection--dark',
          theme: 'dark',
          violations: [],
          error: null,
        },
      ],
      [],
    );
    expect(r.ok).toBe(true);
    expect(r.errored).toEqual([]);
    expect(r.skipped).toEqual([
      {
        storyId: 'patterns-destructivesection--dark',
        theme: 'light',
        reason: 'story pins theme dark via globals',
      },
    ]);
  });

  it('still fails when the mismatch is not a pinned story', () => {
    const r = evaluateScan(
      [
        {
          storyId: 'a--b',
          theme: 'light',
          violations: [],
          error: 'theme not applied: wanted light, story rendered with dark',
        },
      ],
      [],
    );
    expect(r.ok).toBe(false);
    expect(r.skipped).toEqual([]);
  });
});

describe('axe gate: retried scans', () => {
  it('counts scans that only passed on retry without failing the gate', () => {
    const retried = { ...scan('a--x', 'light'), retried: true };
    const r = evaluateScan([retried, scan('a--x', 'dark')], []);
    expect(r.retried).toEqual([{ storyId: 'a--x', theme: 'light' }]);
    expect(r.ok).toBe(true);
  });

  it('reports no retries when none happened', () => {
    expect(evaluateScan([scan('a--x', 'light')], []).retried).toEqual([]);
  });
});

describe('axe gate: one axe-core source loader', () => {
  it('returns the axe-core engine source, ready to inject into a page', () => {
    const src = loadAxeSource(ROOT);
    expect(typeof src).toBe('string');
    expect(src.length).toBeGreaterThan(100_000);
    expect(src).toMatch(/axe\.run|\.run=function|run:/);
  });

  it('is imported, not re-implemented, by both scripts that scan with axe', () => {
    for (const script of ['check-storybook-axe.mjs', 'consistency/axe-run.mjs']) {
      const text = readFileSync(
        path.join(ROOT, 'scripts', script.includes('/') ? 'lib' : '', script),
        'utf8',
      );
      expect(text).toMatch(/loadAxeSource/);
      expect(text).not.toMatch(/createRequire|axe\.min\.js/);
    }
  });
});
