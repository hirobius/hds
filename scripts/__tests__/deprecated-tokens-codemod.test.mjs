/**
 * Tests for codemods/deprecated-tokens.mjs: every `$deprecated` token with a
 * named replacement is rewritten to it, in CSS var, member-chain, DTCG
 * reference and Tailwind form. Seams: `transformSource` (pure), `runCodemod`,
 * and the package wiring (bin, registry, files, the pending upgrade step).
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSource, runCodemod } from '../../codemods/deprecated-tokens.mjs';
import { CODEMODS } from '../../codemods/registry.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const out = (src) => transformSource(src).source;

describe('transformSource', () => {
  it.each([
    ['padding: var(--semantic-space-layout-tight);', 'padding: var(--semantic-space-scale-sm);'],
    ['gap: var( --semantic-docs-space-inline )', 'gap: var( --semantic-space-scale-xs )'],
    ['hds.semantic.space.layout.inset', 'hds.semantic.space.scale.lg'],
    ['tokenRefs.semantic.space.component.padding', 'tokenRefs.semantic.space.surface.padding'],
    ['"{semantic.space.section.heroMax}"', '"{semantic.space.section.inset}"'],
    ['className="p-layout-tight md:-mt-layout-spacious"', 'className="p-scale-sm md:-mt-scale-xl"'],
    ['tokenRefs.semantic.typography.h1.fontSize', 'tokenRefs.semantic.typography.title.fontSize'],
    [
      'font-size: var(--semantic-typography-h1-font-size)',
      'font-size: var(--semantic-typography-title-font-size)',
    ],
  ])('%s -> %s', (before, after) => {
    expect(out(before)).toBe(after);
  });

  it.each([
    // a declaration overrides the old token; rewriting it would retarget the override
    '--semantic-space-layout-tight: 4px;',
    // longer names that only start with a deprecated one
    'var(--semantic-space-layout-tight-x)',
    'hds.semantic.space.layout.tightish',
    // no single replacement (one per tone): left for a person
    'var(--component-badge-bg)',
    // px6 / px10 belong to hds-spacing-steps
    'var(--primitive-space-px6)',
  ])('leaves %s', (src) => {
    expect(transformSource(src).changed).toBe(false);
  });

  it('flags a member it cannot spell (replacement has a numeric segment) for a person', () => {
    const r = transformSource('hds.semantic.space.sidebar.railWidth');
    expect(r.changed).toBe(false);
    expect(r.manual).toEqual(['semantic.space.sidebar.railWidth -> primitive.size.width.280']);
  });

  it('is idempotent', () => {
    const once = out('var(--semantic-space-layout-normal) p-layout-inset');
    expect(out(once)).toBe(once);
  });
});

describe('runCodemod', () => {
  it('rewrites files under root and reports them', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hds-dep-tokens-'));
    try {
      writeFileSync(join(dir, 'a.css'), '.a { gap: var(--semantic-space-layout-tight); }\n');
      writeFileSync(join(dir, 'b.ts'), 'export const b = 1;\n');
      const dry = runCodemod({ root: dir });
      expect(dry.files.map((f) => f.file)).toEqual(['a.css']);
      expect(readFileSync(join(dir, 'a.css'), 'utf8')).toContain('layout-tight');
      runCodemod({ root: dir, write: true });
      expect(readFileSync(join(dir, 'a.css'), 'utf8')).toContain('var(--semantic-space-scale-sm)');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('package wiring', () => {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));

  it('ships as the hds-deprecated-tokens bin, in the registry and the files list', () => {
    expect(pkg.bin['hds-deprecated-tokens']).toBe('codemods/deprecated-tokens.mjs');
    expect(CODEMODS['hds-deprecated-tokens'].file).toBe('deprecated-tokens.mjs');
    expect(pkg.files).toContain('codemods/deprecated-tokens.mjs');
  });

  it('runs from `upgrade` through a pending ledger step', () => {
    const note = JSON.parse(
      readFileSync(join(REPO, 'upgrade/pending/tokens-deprecation-codemod.json'), 'utf8'),
    );
    const step = note.steps.find((s) => s.auto?.codemod === 'hds-deprecated-tokens');
    expect(step.kind).toBe('deprecated');
    expect(step.removeIn).toBe('1.0.0');
  });
});
