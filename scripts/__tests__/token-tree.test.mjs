import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, cpSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  DTCG_KEYS,
  isLeaf,
  parseAlias,
  resolveAlias,
  walkNodes,
  walkTokens,
} from '../lib/token-tree.mjs';

describe('parseAlias', () => {
  it('returns the dot path of a {a.b.c} alias', () => {
    expect(parseAlias('{a.b.c}')).toBe('a.b.c');
  });
  it('returns null for non-aliases', () => {
    expect(parseAlias('#fff')).toBeNull();
    expect(parseAlias(4)).toBeNull();
    expect(parseAlias('{a}b')).toBeNull();
  });
});

describe('isLeaf', () => {
  it('is true only for objects holding $value', () => {
    expect(isLeaf({ $value: 1 })).toBe(true);
    expect(isLeaf({ a: 1 })).toBe(false);
    expect(isLeaf(null)).toBe(false);
    expect(isLeaf('x')).toBe(false);
  });
});

describe('walkTokens', () => {
  it('yields leaves with inherited $type and skips DTCG keys', () => {
    const tree = { $type: 'color', a: { b: { $value: '#fff', $description: 'd' } }, $schema: 'x' };
    expect([...walkTokens(tree)]).toEqual([
      {
        path: ['a', 'b'],
        type: 'color',
        value: '#fff',
        extensions: undefined,
        description: 'd',
        deprecated: undefined,
      },
    ]);
    expect(DTCG_KEYS.has('$schema')).toBe(true);
  });
});

describe('walkNodes', () => {
  it('yields groups pre-order and honours prune and skipKey', () => {
    const tree = { g: { x: { $value: 1 }, skip: { $value: 2 } }, h: { y: { $value: 3 } } };
    const seen = [
      ...walkNodes(tree, {
        skipKey: (k) => k === 'skip',
        prune: (e) => e.path.join('.') === 'h',
      }),
    ].map((e) => `${e.path.join('.')}${e.isLeaf ? '*' : ''}`);
    expect(seen).toEqual(['', 'g', 'g.x*', 'h']);
  });
});

describe('resolveAlias', () => {
  const root = { a: { $value: '{b}' }, b: { $value: '{c}' }, c: { $value: '#000' } };
  it('follows chains', () => expect(resolveAlias('{a}', root)).toBe('#000'));
  it('passes non-aliases through', () => expect(resolveAlias(3, root)).toBe(3));
  it('throws on missing tokens', () => {
    expect(() => resolveAlias('{zz}', root)).toThrow('Token not found');
  });
  it('throws on cycles', () => {
    expect(() => resolveAlias('{p}', { p: { $value: '{p}' } })).toThrow('Circular reference');
  });
  it('enforces maxDepth as a parameter', () => {
    expect(() => resolveAlias('{a}', root, { maxDepth: 2 })).toThrow('Alias chain deeper than 2');
    expect(resolveAlias('{a}', root, { maxDepth: 3 })).toBe('#000');
  });
});

describe('purity', () => {
  it('importing token-tree and build-tokens reads no files from public/', () => {
    // Copy scripts/ alone into a tree with no public/ and import both modules there.
    const dir = mkdtempSync(join(tmpdir(), 'tt-'));
    try {
      cpSync(resolve(__dirname, '..'), join(dir, 'scripts'), {
        recursive: true,
        filter: (s) => !s.includes('__tests__'),
      });
      symlinkSync(resolve(__dirname, '../../node_modules'), join(dir, 'node_modules'));
      copyFileSync(resolve(__dirname, '../../package.json'), join(dir, 'package.json'));
      const code = `await import('./scripts/lib/token-tree.mjs'); await import('./scripts/build-tokens.mjs'); console.log('ok');`;
      const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: dir,
        encoding: 'utf8',
      });
      expect(r.stderr).toBe('');
      expect(r.stdout.trim()).toBe('ok');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
