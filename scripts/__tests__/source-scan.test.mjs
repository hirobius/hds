/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for the shared source-scan module (scripts/lib/source-scan.mjs).
 *
 * One walker, one spec rule, one suppression grammar for the check-* gates
 * (hds#643). Each case pins a behavior the migrated gates relied on from their
 * private copies, so the migration cannot quietly change what a gate scans.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

import {
  scanSources,
  suppressionFor,
  findMarker,
  maskComments,
  lineOf,
  isSpecFile,
  resolveScanRoots,
  EXEMPTION_MARKERS,
} from '../lib/source-scan.mjs';

let dirs = [];
function tree(files) {
  const base = mkdtempSync(path.join(tmpdir(), 'hds-source-scan-'));
  dirs.push(base);
  for (const f of files) {
    const abs = path.join(base, f);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, '');
  }
  return base;
}
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});
const rel = (base, files) => files.map((f) => path.relative(base, f).replace(/\\/g, '/')).sort();

describe('scanSources', () => {
  it('walks roots recursively and keeps only the requested extensions', () => {
    const root = tree(['src/a.ts', 'src/deep/b.tsx', 'src/c.css', 'src/d.md']);
    const files = scanSources({ root, gate: 't', roots: ['src'], exts: ['.ts', '.tsx'] });
    expect(rel(root, files)).toEqual(['src/a.ts', 'src/deep/b.tsx']);
  });

  it('returns absolute paths', () => {
    const root = tree(['src/a.ts']);
    const [file] = scanSources({ root, gate: 't', roots: ['src'], exts: ['.ts'] });
    expect(path.isAbsolute(file)).toBe(true);
  });

  it('skips the named directories at any depth', () => {
    const root = tree([
      'src/a.ts',
      'src/data/b.ts',
      'src/x/node_modules/c.ts',
      'src/x/y/dist/d.ts',
    ]);
    const files = scanSources({
      root,
      gate: 't',
      roots: ['src'],
      exts: ['.ts'],
      skipDirs: ['data', 'node_modules', 'dist'],
    });
    expect(rel(root, files)).toEqual(['src/a.ts']);
  });

  it('skips node_modules, .git and dist by default', () => {
    const root = tree(['src/a.ts', 'src/node_modules/b.ts', 'src/.git/c.ts', 'src/dist/d.ts']);
    const files = scanSources({ root, gate: 't', roots: ['src'], exts: ['.ts'] });
    expect(rel(root, files)).toEqual(['src/a.ts']);
  });

  it('a skipDirs list replaces the default rather than adding to it', () => {
    const root = tree(['src/a.ts', 'src/dist/b.ts']);
    const files = scanSources({
      root,
      gate: 't',
      roots: ['src'],
      exts: ['.ts'],
      skipDirs: ['data'],
    });
    expect(rel(root, files)).toEqual(['src/a.ts', 'src/dist/b.ts']);
  });

  it('excludes spec files unless includeSpecs is set', () => {
    const root = tree(['src/a.ts', 'src/a.test.ts', 'src/b.spec.tsx', 'src/latest.ts']);
    const without = scanSources({ root, gate: 't', roots: ['src'], exts: ['.ts', '.tsx'] });
    expect(rel(root, without)).toEqual(['src/a.ts', 'src/latest.ts']);
    const withSpecs = scanSources({
      root,
      gate: 't',
      roots: ['src'],
      exts: ['.ts', '.tsx'],
      includeSpecs: true,
    });
    expect(rel(root, withSpecs)).toEqual([
      'src/a.test.ts',
      'src/a.ts',
      'src/b.spec.tsx',
      'src/latest.ts',
    ]);
  });

  it('throws naming the gate when a configured root is missing', () => {
    const root = tree(['src/a.ts']);
    expect(() =>
      scanSources({ root, gate: 'check-x', roots: ['src', 'gone'], exts: ['.ts'] }),
    ).toThrow(/check-x.*gone/s);
  });

  it('an optional missing root is skipped, but every root missing still throws', () => {
    const root = tree(['src/a.ts']);
    const files = scanSources({
      root,
      gate: 't',
      roots: ['src', { path: 'gone', optional: true }],
      exts: ['.ts'],
    });
    expect(rel(root, files)).toEqual(['src/a.ts']);
    expect(() =>
      scanSources({ root, gate: 't', roots: [{ path: 'gone', optional: true }], exts: ['.ts'] }),
    ).toThrow(/vacuous/);
  });

  it('throws when no roots are configured', () => {
    const root = tree([]);
    expect(() => scanSources({ root, gate: 't', roots: [], exts: ['.ts'] })).toThrow(
      /no scan roots/,
    );
  });

  it('scans several roots in order', () => {
    const root = tree(['a/1.ts', 'b/2.ts']);
    const files = scanSources({ root, gate: 't', roots: ['b', 'a'], exts: ['.ts'] });
    expect(rel(root, files)).toEqual(['a/1.ts', 'b/2.ts']);
    expect(files[0]).toContain(`${path.sep}b${path.sep}`);
  });
});

describe('resolveScanRoots and isSpecFile are absorbed', () => {
  it('re-exports the root guard and the spec rule', () => {
    expect(typeof resolveScanRoots).toBe('function');
    expect(isSpecFile('x.test.ts')).toBe(true);
    expect(isSpecFile('latest.ts')).toBe(false);
  });
});

describe('suppressionFor', () => {
  const lines = ['const a = 1;', '// layout-gap-ok: reason here', 'const b = 2;', 'const c = 3;'];

  it('matches a marker on the same line', () => {
    const s = suppressionFor('layout-gap-ok');
    expect(s(['x // layout-gap-ok: why'], 0)).toBe(true);
  });

  it('matches a marker on the previous line by default (lookback 1)', () => {
    const s = suppressionFor('layout-gap-ok');
    expect(s(lines, 2)).toBe(true);
    expect(s(lines, 3)).toBe(false);
    expect(s(lines, 0)).toBe(false);
  });

  it('lookback 0 reads the offending line only', () => {
    const s = suppressionFor('layout-gap-ok', { lookback: 0 });
    expect(s(lines, 2)).toBe(false);
    expect(s(lines, 1)).toBe(true);
  });

  it('lookback 2 reaches two lines up', () => {
    const s = suppressionFor('layout-gap-ok', { lookback: 2 });
    expect(s(lines, 3)).toBe(true);
  });

  it('requireReason rejects a bare marker and accepts one with text', () => {
    const s = suppressionFor('type-ramp-ok', { requireReason: true, lookback: 2 });
    expect(s(['// type-ramp-ok:', 'x'], 1)).toBe(false);
    expect(s(['// type-ramp-ok:   ', 'x'], 1)).toBe(false);
    expect(s(['// type-ramp-ok', 'x'], 1)).toBe(false);
    expect(s(['// type-ramp-ok: pinned by the spec', 'x'], 1)).toBe(true);
  });

  it('without requireReason a marker with no reason still suppresses', () => {
    const s = suppressionFor('spacing-vocab-ok');
    expect(s(['x // spacing-vocab-ok'], 0)).toBe(true);
  });

  it('accepts several markers: any one suppresses', () => {
    const s = suppressionFor(['spacing-ok', 'audit-ok'], { lookback: 0 });
    expect(s(['x // audit-ok: y'], 0)).toBe(true);
    expect(s(['x // spacing-ok: y'], 0)).toBe(true);
    expect(s(['x'], 0)).toBe(false);
  });

  it('a trailing colon on the marker demands the colon form', () => {
    const s = suppressionFor('layout-ok:');
    expect(s(['x // layout-ok: because'], 0)).toBe(true);
    expect(s(['x // layout-ok because'], 0)).toBe(false);
  });

  it('tolerates indexes outside the file', () => {
    const s = suppressionFor('layout-gap-ok');
    expect(s([], 0)).toBe(false);
    expect(s(lines, 99)).toBe(false);
  });

  it('refuses a marker that check-exemptions does not know', () => {
    expect(() => suppressionFor('widget-ok')).toThrow(/widget-ok.*EXEMPTION_MARKERS/s);
  });
});

describe('findMarker', () => {
  it('returns the nearest marker line and its reason text', () => {
    const lines = ['// uppercase-ok: a real reason', 'x', 'y'];
    expect(findMarker(lines, 2, 'uppercase-ok', 2)).toEqual({ line: 0, reason: ' a real reason' });
  });

  it('prefers the offending line over earlier ones', () => {
    const lines = ['// uppercase-ok: old', 'x // uppercase-ok: new'];
    expect(findMarker(lines, 1, 'uppercase-ok', 1)).toEqual({ line: 1, reason: ' new' });
  });

  it('returns null when nothing is in reach', () => {
    expect(findMarker(['a', 'b', 'c', 'd'], 3, 'uppercase-ok', 1)).toBeNull();
  });
});

describe('maskComments', () => {
  it('blanks block comments but keeps every newline', () => {
    const text = 'a /* x\ny */ b';
    const masked = maskComments(text);
    expect(masked.split('\n')).toHaveLength(2);
    expect(masked).not.toContain('x');
    expect(masked.length).toBe(text.length);
  });

  it('blanks line comments after whitespace or at line start, not inside URLs', () => {
    expect(maskComments('a // note').trim()).toBe('a');
    expect(maskComments('// whole line').trim()).toBe('');
    expect(maskComments('href="http://x.y"')).toBe('href="http://x.y"');
  });

  it('leadChars widens what may precede a line comment', () => {
    expect(maskComments('f(//c')).toContain('//c');
    expect(maskComments('f(//c', { leadChars: ' \t;,{(' })).not.toContain('//c');
  });
});

describe('lineOf', () => {
  it('is the 1-based line of a character index', () => {
    const text = 'one\ntwo\nthree';
    expect(lineOf(text, 0)).toBe(1);
    expect(lineOf(text, 4)).toBe(2);
    expect(lineOf(text, text.indexOf('three'))).toBe(3);
  });
});

describe('EXEMPTION_MARKERS', () => {
  it('is a list of unique "<name>-ok" markers', () => {
    expect(new Set(EXEMPTION_MARKERS).size).toBe(EXEMPTION_MARKERS.length);
    for (const m of EXEMPTION_MARKERS) expect(m).toMatch(/^[a-z][a-z-]*-ok$/);
  });
});
