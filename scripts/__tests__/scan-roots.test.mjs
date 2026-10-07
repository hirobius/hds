/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for the scan-root guard (scripts/lib/scan-roots.mjs).
 *
 * A configured scan root that does not exist is a CONFIGURATION ERROR, not an
 * empty directory: a gate must fail on it rather than quietly scanning less
 * than it claims. A root that is legitimately optional says so in code, at the
 * call site.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

  it('CANARY: throws on a dead root, naming it', () => {
    const base = fixture('src/app/components');
    expect(() =>
      resolveScanRoots(['src/app/components', 'src/app/pages'], { root: base, gate: 'g' }),
    ).toThrow(/src\/app\/pages/);
  });

  it('names the gate in the error', () => {
    const base = fixture();
    expect(() => resolveScanRoots(['nope'], { root: base, gate: 'check-focus-states' })).toThrow(
      /check-focus-states/,
    );
  });

  it('reports every dead root at once', () => {
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

  it('throws when every root is dead rather than returning an empty list', () => {
    const base = fixture();
    expect(() => resolveScanRoots(['a', 'b'], { root: base, gate: 'g' })).toThrow();
  });

  it('throws when given no roots at all', () => {
    const base = fixture();
    expect(() => resolveScanRoots([], { root: base, gate: 'g' })).toThrow(/no scan roots/i);
  });

  it('rejects a file masquerading as a scan root', () => {
    const base = fixture('src');
    writeFileSync(path.join(base, 'src', 'x.txt'), 'x');
    expect(() => resolveScanRoots(['src/x.txt'], { root: base, gate: 'g' })).toThrow(
      /not a directory/i,
    );
  });
});

describe('resolveScanRoots — optional roots', () => {
  it('allows a root marked optional to be absent', () => {
    const base = fixture('src/app/components');
    expect(
      resolveScanRoots(['src/app/components', { path: 'src/app/lab', optional: true }], {
        root: base,
        gate: 'g',
      }),
    ).toEqual([path.join(base, 'src/app/components')]);
  });

  it('still includes an optional root when it exists', () => {
    const base = fixture('src/app/lab');
    expect(
      resolveScanRoots([{ path: 'src/app/lab', optional: true }], { root: base, gate: 'g' }),
    ).toEqual([path.join(base, 'src/app/lab')]);
  });

  it('throws when every root is optional and none exist', () => {
    const base = fixture();
    expect(() =>
      resolveScanRoots([{ path: 'a', optional: true }], { root: base, gate: 'g' }),
    ).toThrow(/resolved to nothing/i);
  });
});
