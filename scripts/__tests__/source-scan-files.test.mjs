/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for gateFiles / isCommentLine in scripts/lib/source-scan.mjs
 * (hds#1010): the shared file list, file read and comment skip of line-scoped gates.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { fileLines, gateFiles, isCommentLine, textViolations } from '../lib/source-scan.mjs';

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
  it('filters scanned files through keep', () => {
    const ctx = { ROOT: resolve('scripts'), isFixtureMode: false };
    const keep = (f) => !f.endsWith('source-scan.mjs');
    const files = gateFiles(ctx, { gate: 'x', roots: ['lib'], exts: ['.mjs'], keep });
    expect(files.length).toBeGreaterThan(0);
    expect(files).not.toContain(resolve('scripts/lib/source-scan.mjs'));
  });
  it('does not filter the fixture file through keep', () => {
    const ctx = { ROOT: '/nowhere', isFixtureMode: true, fixtureFile: 'f.tsx' };
    const opts = { gate: 'x', roots: ['src'], exts: ['.tsx'], keep: () => false };
    expect(gateFiles(ctx, opts)).toEqual([resolve('f.tsx')]);
  });
});

describe('fileLines', () => {
  it('returns the root-relative posix path and the split lines', () => {
    const { rel, lines } = fileLines(resolve('.'), resolve('scripts/lib/source-scan.mjs'));
    expect(rel).toBe('scripts/lib/source-scan.mjs');
    expect(lines[0]).toContain('@internal');
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

describe('textViolations', () => {
  it('runs the finder on each file with its text and root-relative posix path, in order', () => {
    const calls = [];
    const find = (text, rel) => {
      calls.push(rel);
      return text.startsWith('/** @internal') ? [{ rel }] : [];
    };
    const files = [resolve('scripts/lib/source-scan.mjs'), resolve('scripts/lib/gate-output.mjs')];
    const out = textViolations(resolve('.'), files, find);
    expect(calls).toEqual(['scripts/lib/source-scan.mjs', 'scripts/lib/gate-output.mjs']);
    expect(out[0]).toEqual({ rel: 'scripts/lib/source-scan.mjs' });
  });
  it('returns an empty list for no files', () => {
    expect(textViolations('/nowhere', [], () => [{ x: 1 }])).toEqual([]);
  });
});
