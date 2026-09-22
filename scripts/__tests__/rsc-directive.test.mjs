/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Tests for the `'use client'` decision (scripts/lib/rsc-directive.mjs).
 *
 * The package ships React hooks with no client directive, so a Next.js App
 * Router consumer breaks on first import — while CONSUMING.md advertises
 * Next.js. The fix is NOT a blanket banner: `brand`, `tokens`, `cn`,
 * `manifest` and `mui` are framework-free by design and are used from server
 * and edge code, and a `'use client'` on them would turn every export into a
 * client reference. So the directive is decided per chunk, and BOTH
 * directions are pinned here: React-bearing chunks get it, server-safe chunks
 * do not.
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

import {
  chunksNeedingDirective,
  applyDirectives,
  DIRECTIVE,
  isReactSpecifier,
  auditDist,
} from '../lib/rsc-directive.mjs';

/** A minimal Rollup-shaped bundle: fileName -> { type, imports, code }. */
const chunk = (imports, code = 'export {};') => ({ type: 'chunk', imports, code });

describe('isReactSpecifier', () => {
  it('recognises the React entry points a chunk can import', () => {
    for (const s of [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
    ]) {
      expect(isReactSpecifier(s), s).toBe(true);
    }
  });

  it('does not treat React-adjacent packages as React itself', () => {
    // These are decided by whether the chunk that uses them imports React —
    // not by name. `react-hook-form` in form.js is the real case: the entry
    // reaches React through the chunk it imports, not through this name.
    for (const s of [
      'react-hook-form',
      'react-router',
      '@radix-ui/react-slot',
      'lucide-react',
      'clsx',
    ]) {
      expect(isReactSpecifier(s), s).toBe(false);
    }
  });
});

describe('chunksNeedingDirective', () => {
  it('marks a chunk that imports React directly', () => {
    const bundle = { 'ui.js': chunk(['react', 'clsx']) };
    expect(chunksNeedingDirective(bundle)).toEqual(new Set(['ui.js']));
  });

  it('marks a chunk that imports jsx-runtime, which every compiled component does', () => {
    const bundle = { 'scroll.js': chunk(['react/jsx-runtime', 'lenis/react']) };
    expect(chunksNeedingDirective(bundle)).toEqual(new Set(['scroll.js']));
  });

  it('leaves a framework-free chunk alone, so server and edge consumers keep real exports', () => {
    const bundle = {
      'brand.js': chunk([]),
      'tokens.js': chunk([]),
      'cn.js': chunk(['clsx', 'tailwind-merge']),
    };
    expect(chunksNeedingDirective(bundle)).toEqual(new Set());
  });

  it('propagates through an internal chunk: an entry that only re-exports React code still needs it', () => {
    // form.js imports react-hook-form and a shared chunk; only the chunk
    // imports React. A Server Component importing from form.js must still hit
    // a client boundary, so the entry inherits the need.
    const bundle = {
      'form.js': chunk(['react-hook-form', 'chunks/form-abc.js']),
      'chunks/form-abc.js': chunk(['react/jsx-runtime']),
    };
    expect(chunksNeedingDirective(bundle)).toEqual(new Set(['form.js', 'chunks/form-abc.js']));
  });

  it('propagates transitively, not just one hop', () => {
    const bundle = {
      'a.js': chunk(['chunks/b.js']),
      'chunks/b.js': chunk(['chunks/c.js']),
      'chunks/c.js': chunk(['react']),
    };
    expect(chunksNeedingDirective(bundle)).toEqual(new Set(['a.js', 'chunks/b.js', 'chunks/c.js']));
  });

  it('does not let a React chunk taint a sibling that never imports it', () => {
    const bundle = {
      'ui.js': chunk(['react']),
      'tokens.js': chunk([]),
    };
    expect(chunksNeedingDirective(bundle)).toEqual(new Set(['ui.js']));
  });

  it('ignores non-chunk bundle entries such as CSS assets', () => {
    const bundle = {
      'tokens.css': { type: 'asset', source: '' },
      'ui.js': chunk(['react']),
    };
    expect(chunksNeedingDirective(bundle)).toEqual(new Set(['ui.js']));
  });
});

describe('applyDirectives', () => {
  it('prepends the directive as the very first statement, before imports', () => {
    const bundle = {
      'ui.js': chunk(['react'], 'import { jsx } from "react/jsx-runtime";\nexport const A = 1;'),
    };
    const touched = applyDirectives(bundle);
    expect(touched).toEqual(['ui.js']);
    expect(bundle['ui.js'].code.startsWith(`${DIRECTIVE}\n`)).toBe(true);
    expect(bundle['ui.js'].code.indexOf(DIRECTIVE)).toBe(0);
  });

  it('is idempotent, since the plugin may run on an already-marked chunk', () => {
    const bundle = { 'ui.js': chunk(['react'], `${DIRECTIVE}\nexport const A = 1;`) };
    applyDirectives(bundle);
    expect(bundle['ui.js'].code.split(DIRECTIVE).length - 1).toBe(1);
  });

  it('never writes the directive into a framework-free chunk', () => {
    const bundle = { 'brand.js': chunk([], 'export const overlay = () => 1;') };
    expect(applyDirectives(bundle)).toEqual([]);
    expect(bundle['brand.js'].code.includes('use client')).toBe(false);
  });
});

describe('auditDist', () => {
  let dir;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  function write(files) {
    dir = mkdtempSync(path.join(tmpdir(), 'hds-rsc-'));
    for (const [rel, code] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), code);
    }
    return dir;
  }

  it('passes a dist where every React chunk is marked and every server-safe chunk is not', () => {
    write({
      'ui.js': `${DIRECTIVE}\nimport { jsx } from "react/jsx-runtime";\nexport const A = 1;`,
      'tokens.js': 'export const t = 1;',
      'form.js': `${DIRECTIVE}\nimport { x } from "./chunks/form-1.js";\nexport { x };`,
      'chunks/form-1.js': `${DIRECTIVE}\nimport { jsx } from "react/jsx-runtime";\nexport const x = 1;`,
    });
    expect(auditDist(dir)).toEqual({ missing: [], spurious: [], scanned: 4 });
  });

  it('reports a React chunk that lacks the directive — the shipped defect', () => {
    write({ 'ui.js': 'import { useState } from "react";\nexport const A = 1;' });
    expect(auditDist(dir).missing).toEqual(['ui.js']);
  });

  it('reports a framework-free chunk that carries it — the blanket-banner mistake', () => {
    write({ 'brand.js': `${DIRECTIVE}\nexport const overlay = () => 1;` });
    expect(auditDist(dir).spurious).toEqual(['brand.js']);
  });

  it('reports an entry that reaches React only through a chunk and is unmarked', () => {
    write({
      'form.js': 'import { x } from "./chunks/form-1.js";\nexport { x };',
      'chunks/form-1.js': `${DIRECTIVE}\nimport { jsx } from "react/jsx-runtime";\nexport const x = 1;`,
    });
    expect(auditDist(dir).missing).toEqual(['form.js']);
  });

  it('counts what it scanned, so an empty dist cannot pass vacuously', () => {
    write({});
    expect(auditDist(dir).scanned).toBe(0);
  });

  // Rollup, not esbuild, renders the import statements, so real output today is
  // spaced (`import { jsx } from "react/jsx-runtime";`) and the audit reads it
  // correctly. But nothing GUARANTEES that: the audit re-parses text while the
  // build plugin reads Rollup's structured metadata, and if the two ever
  // disagree about the graph the gate can fail a correct build or — far worse —
  // pass a wrong one. These pin the whitespace-free forms so the audit does not
  // silently depend on a formatting detail it does not control.
  it('reads a minified import with no space after the keyword', () => {
    write({ 'ui.js': 'import{jsx as j}from"react/jsx-runtime";export const A=1;' });
    expect(auditDist(dir).missing).toEqual(['ui.js']);
  });

  it('reads a minified star re-export with no spaces', () => {
    write({
      'a.js': 'export*from"./chunks/b.js";',
      'chunks/b.js': `${DIRECTIVE}\nimport{jsx}from"react/jsx-runtime";export const x=1;`,
    });
    expect(auditDist(dir).missing).toEqual(['a.js']);
  });

  it('reads an import that is not the first statement on its line', () => {
    // Whole-file minification puts statements on one line separated by `;`.
    write({ 'ui.js': 'const a=1;import{jsx}from"react/jsx-runtime";export const A=a;' });
    expect(auditDist(dir).missing).toEqual(['ui.js']);
  });

  it('still ignores a bare word that merely starts with the keyword', () => {
    // `important` must not read as `import`.
    write({ 'ok.js': 'const important="x";export const A=1;' });
    expect(auditDist(dir)).toEqual({ missing: [], spurious: [], scanned: 1 });
  });
});
