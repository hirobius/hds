/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for add-dts-extensions (scripts/add-dts-extensions.mjs).
 *
 * The script rewrites extensionless relative specifiers in emitted .d.ts so
 * `moduleResolution: node16`/`nodenext` consumers can resolve them. Nothing in
 * the normal build catches a regression here: `tsc` is happy either way, the
 * library build is happy either way, and every test in this repo imports from
 * `src/`, not from `dist/types/`. The only signal is attw, run against a
 * packed tarball — so these tests hold the rewrite rules directly.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

import { rewriteSource, resolverFor, dtsFiles } from '../add-dts-extensions.mjs';

/** Resolver stub: every specifier is a plain sibling module. */
const asSibling = (spec) => `${spec}.js`;

describe('rewriteSource', () => {
  it('adds .js to a plain import specifier', () => {
    const { text, rewritten } = rewriteSource(`import { B } from './button';`, asSibling);
    expect(text).toBe(`import { B } from './button.js';`);
    expect(rewritten).toBe(1);
  });

  it('rewrites re-exports, which is how the barrel is built', () => {
    const { text } = rewriteSource(`export * from './app/components/alert';`, asSibling);
    expect(text).toBe(`export * from './app/components/alert.js';`);
  });

  it('rewrites a named re-export', () => {
    const { text } = rewriteSource(`export { Card } from './card';`, asSibling);
    expect(text).toBe(`export { Card } from './card.js';`);
  });

  it('rewrites a dynamic import in a type position', () => {
    const { text } = rewriteSource(`type T = import('./tokens').Tokens;`, asSibling);
    expect(text).toBe(`type T = import('./tokens.js').Tokens;`);
  });

  it('rewrites a side-effect import', () => {
    const { text } = rewriteSource(`import './register';`, asSibling);
    expect(text).toBe(`import './register.js';`);
  });

  it('handles parent-relative specifiers', () => {
    const { text } = rewriteSource(`import { cn } from '../../lib/utils';`, asSibling);
    expect(text).toBe(`import { cn } from '../../lib/utils.js';`);
  });

  it('preserves double quotes rather than normalising them', () => {
    const { text } = rewriteSource(`import { B } from "./button";`, asSibling);
    expect(text).toBe(`import { B } from "./button.js";`);
  });

  it('leaves bare package specifiers alone — only relative ones are ours', () => {
    const source = `import { forwardRef } from 'react';\nimport clsx from 'clsx';`;
    const { text, rewritten } = rewriteSource(source, asSibling);
    expect(text).toBe(source);
    expect(rewritten).toBe(0);
  });

  it('is idempotent — a second pass changes nothing', () => {
    const once = rewriteSource(`export * from './button';`, asSibling).text;
    const twice = rewriteSource(once, asSibling);
    expect(twice.text).toBe(once);
    expect(twice.rewritten).toBe(0);
  });

  it('leaves .css, .json and .js specifiers alone', () => {
    for (const spec of ['./styles.css', './data.json', './already.js']) {
      const source = `import x from '${spec}';`;
      expect(rewriteSource(source, asSibling).text).toBe(source);
    }
  });

  it('reports a specifier that resolves to nothing instead of guessing', () => {
    // Silently emitting a wrong path is the failure this script exists to end,
    // so an unresolvable specifier must surface, not be patched over.
    const { text, unresolved, rewritten } = rewriteSource(`import './ghost';`, () => null);
    expect(unresolved).toEqual(['./ghost']);
    expect(rewritten).toBe(0);
    expect(text).toBe(`import './ghost';`);
  });
});

describe('resolverFor', () => {
  let dir;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('prefers a sibling .d.ts, and falls back to a directory index', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'hds-dts-'));
    writeFileSync(path.join(dir, 'button.d.ts'), 'export {};');
    mkdirSync(path.join(dir, 'context'));
    writeFileSync(path.join(dir, 'context', 'index.d.ts'), 'export {};');

    const resolve = resolverFor(dir);
    expect(resolve('./button')).toBe('./button.js');
    expect(resolve('./context')).toBe('./context/index.js');
    expect(resolve('./nope')).toBeNull();
  });

  it('resolves a sibling file over a same-named directory, as Node does', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'hds-dts-'));
    writeFileSync(path.join(dir, 'both.d.ts'), 'export {};');
    mkdirSync(path.join(dir, 'both'));
    writeFileSync(path.join(dir, 'both', 'index.d.ts'), 'export {};');

    expect(resolverFor(dir)('./both')).toBe('./both.js');
  });
});

describe('dtsFiles', () => {
  it('walks nested directories and collects only .d.ts', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hds-dts-'));
    try {
      writeFileSync(path.join(root, 'a.d.ts'), '');
      writeFileSync(path.join(root, 'ignored.js'), '');
      mkdirSync(path.join(root, 'nested'));
      writeFileSync(path.join(root, 'nested', 'b.d.ts'), '');

      const found = dtsFiles(root)
        .map((f) => path.relative(root, f).replaceAll('\\', '/'))
        .sort();
      expect(found).toEqual(['a.d.ts', 'nested/b.d.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
