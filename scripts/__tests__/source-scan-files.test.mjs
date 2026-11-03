/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for gateFiles / isCommentLine in scripts/lib/source-scan.mjs
 * (hds#1010): the shared file list and comment skip of line-scoped gates.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { gateFiles, isCommentLine } from '../lib/source-scan.mjs';

describe('gateFiles', () => {
  it('returns only the resolved fixture file in fixture mode', () => {
    const ctx = { ROOT: '/nowhere', isFixtureMode: true, fixtureFile: 'f.tsx' };
    expect(gateFiles(ctx, { gate: 'x', roots: ['src'], exts: ['.tsx'] })).toEqual([
      resolve('f.tsx'),
    ]);
  });
  it('scans the roots under ROOT otherwise', () => {
    const ctx = { ROOT: resolve('scripts'), isFixtureMode: false };
    const files = gateFiles(ctx, { gate: 'x', roots: ['lib'], exts: ['.mjs'] });
    expect(files).toContain(resolve('scripts/lib/source-scan.mjs'));
  });
});

describe('isCommentLine', () => {
  it.each([['// x'], ['  * y'], ['\t/// w']])('treats %j as a comment', (l) => {
    expect(isCommentLine(l)).toBe(true);
  });
  it('treats code as code', () => {
    expect(isCommentLine('const a = 1; // c')).toBe(false);
  });
});
