/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for the scan-root guard (scripts/lib/scan-roots.mjs).
 *
 * WHY THIS EXISTS (#265)
 * ──────────────────────
 * `src/app/pages` was removed. `check-focus-states` still lists it in
 * SCAN_DIRS, so half its declared scan set resolves to nothing — and the gate
 * reports no difference between "scanned and found nothing" and "there was
 * nothing to scan". It still scans `src/app/components`, so it is not vacuous
 * today; it is one directory move away from being vacuous and still green.
 *
 * That is the same shape as every other defect this repo has been removing:
 * a gate that looks like it covers something and structurally cannot.
 *
 * The rule here is deliberately harsh. A configured scan root that does not
 * exist is a CONFIGURATION ERROR, not an empty directory, and a gate must fail
 * on it rather than quietly scanning less than it claims. A root that is
 * legitimately optional has to say so, in code, at the call site.
 */

import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

import { resolveScanRoots } from '../lib/scan-roots.mjs';

let dirs = [];
const fixture = (...sub) => {
  const base = mkdtempSync(path.join(tmpdir(), 'hds-scan-'));
  dirs.push(base);
  for (const s of sub) mkdirSync(path.join(base, s), { recursive: true });
  return base;
};
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

describe('resolveScanRoots', () => {
  it('returns absolute paths for roots that exist', () => {
    const base = fixture('src/app/components');
    expect(resolveScanRoots(['src/app/components'], { root: base, gate: 'g' })).toEqual([
      path.join(base, 'src/app/components'),
    ]);
  });

  it('THROWS on a root that does not exist — the whole point', () => {
    const base = fixture('src/app/components');
    expect(() =>
      resolveScanRoots(['src/app/components', 'src/app/pages'], { root: base, gate: 'g' }),
    ).toThrow(/src\/app\/pages/);
  });

  it('names the gate in the error, so the failure needs no search', () => {
    const base = fixture();
    expect(() => resolveScanRoots(['nope'], { root: base, gate: 'check-focus-states' })).toThrow(
      /check-focus-states/,
    );
  });

  it('reports every dead root at once, not just the first', () => {
    const base = fixture('real');
    let message = '';
    try {
      resolveScanRoots(['real', 'deadA', 'deadB'], { root: base, gate: 'g' });
    } catch (e) {
      message = e.message;
    }
    expect(message).toMatch(/deadA/);
    expect(message).toMatch(/deadB/);
  });

  it('throws when EVERY root is dead, rather than returning an empty list', () => {
    // Returning [] would let a caller loop over nothing and exit 0 — the exact
    // vacuous pass this guard exists to prevent.
    const base = fixture();
    expect(() => resolveScanRoots(['a', 'b'], { root: base, gate: 'g' })).toThrow();
  });

  it('throws when given no roots at all', () => {
    const base = fixture();
    expect(() => resolveScanRoots([], { root: base, gate: 'g' })).toThrow(/no scan roots/i);
  });

  it('rejects a file masquerading as a scan root', () => {
    // existsSync is true for a file, so a plain existence check would pass it
    // and then the directory walk would find nothing.
    const base = fixture('src');
    const file = path.join(base, 'src', 'x.txt');
    require('node:fs').writeFileSync(file, 'x');
    expect(() => resolveScanRoots(['src/x.txt'], { root: base, gate: 'g' })).toThrow(
      /not a directory/i,
    );
  });
});

describe('resolveScanRoots — optional roots', () => {
  it('allows a root marked optional to be absent', () => {
    // A root that is legitimately conditional must say so at the call site,
    // in code, rather than being silently tolerated everywhere.
    const base = fixture('src/app/components');
    expect(
      resolveScanRoots(['src/app/components', { path: 'src/app/lab', optional: true }], {
        root: base,
        gate: 'g',
      }),
    ).toEqual([path.join(base, 'src/app/components')]);
  });

  it('still includes an optional root when it does exist', () => {
    const base = fixture('src/app/components', 'src/app/lab');
    expect(
      resolveScanRoots([{ path: 'src/app/lab', optional: true }], { root: base, gate: 'g' }),
    ).toEqual([path.join(base, 'src/app/lab')]);
  });

  it('throws when every root is optional and none exist — still a vacuous scan', () => {
    const base = fixture();
    expect(() =>
      resolveScanRoots([{ path: 'a', optional: true }], { root: base, gate: 'g' }),
    ).toThrow(/resolved to nothing/i);
  });
});
