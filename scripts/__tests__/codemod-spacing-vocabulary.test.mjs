/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/codemod-spacing-vocabulary.mjs (hds#206 remaining work).
 *
 * The applyReplacements tests run in memory. The rewriteFile tests read two
 * source files and never write.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyReplacements, rewriteFile, REPLACEMENTS } from '../codemod-spacing-vocabulary.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('applyReplacements', () => {
  it('rewrites a CSS var() consumption site to the canonical scale token', () => {
    const { text, count } = applyReplacements('gap: var(--semantic-space-layout-tight);');
    expect(text).toBe('gap: var(--semantic-space-scale-sm);');
    expect(count).toBe(1);
  });

  it('rewrites the deprecated var() names that have no runtime override', () => {
    const cases = [
      ['var(--semantic-space-layout-tight)', 'var(--semantic-space-scale-sm)'],
      ['var(--semantic-space-layout-normal)', 'var(--semantic-space-scale-md)'],
      ['var(--semantic-space-layout-inset)', 'var(--semantic-space-scale-lg)'],
      ['var(--semantic-space-layout-spacious)', 'var(--semantic-space-scale-xl)'],
      ['var(--semantic-space-component-gap)', 'var(--semantic-space-scale-xs)'],
    ];
    for (const [before, after] of cases) {
      expect(applyReplacements(before).text).toBe(after);
    }
  });

  it('rewrites the hds.semantic.space dotted accessor form', () => {
    const text = 'gap: hds.semantic.space.component.gap,';
    expect(applyReplacements(text).text).toBe('gap: hds.semantic.space.scale.xs,');
  });

  it('rewrites the bare dotted string-label form (e.g. Storybook demo args)', () => {
    const text = "tokenPath: 'semantic.space.component.gap',";
    expect(applyReplacements(text).text).toBe("tokenPath: 'semantic.space.scale.xs',");
  });

  it('renames component.padding and layout.gutter to their canonical overridable names (hds#206 slice 3)', () => {
    const cases = [
      ['var(--semantic-space-component-padding)', 'var(--semantic-space-surface-padding)'],
      ['var(--semantic-space-layout-gutter)', 'var(--semantic-space-region-gutter)'],
      ['p-[var(--semantic-space-component-padding)]', 'p-[var(--semantic-space-surface-padding)]'],
      ["'semantic.space.component.padding'", "'semantic.space.surface.padding'"],
      ['hds.semantic.space.component.padding', 'hds.semantic.space.surface.padding'],
      ['hds.semantic.space.layout.gutter', 'hds.semantic.space.region.gutter'],
    ];
    for (const [before, after] of cases) {
      expect(applyReplacements(before).text).toBe(after);
    }
  });

  it('never points component.padding / layout.gutter at a scale token (that would drop the tenant, density and responsive overrides)', () => {
    const { text } = applyReplacements(
      'padding: var(--semantic-space-component-padding); gap: var(--semantic-space-layout-gutter);',
    );
    expect(text).not.toMatch(/scale-/);
  });

  it('rewrites multiple occurrences on one line and counts each', () => {
    const text =
      'top: var(--semantic-space-component-gap); right: var(--semantic-space-component-gap);';
    const { text: out, count } = applyReplacements(text);
    expect(out).toBe('top: var(--semantic-space-scale-xs); right: var(--semantic-space-scale-xs);');
    expect(count).toBe(2);
  });

  it('does NOT touch the unrelated --semantic-space-layout-gap token', () => {
    const text = 'gap: var(--semantic-space-layout-gap);';
    const { text: out, count } = applyReplacements(text);
    expect(out).toBe(text);
    expect(count).toBe(0);
  });

  it('does NOT touch a bare CSS custom-property declaration (only var() reads)', () => {
    const text = '--semantic-space-layout-gutter: var(--semantic-space-region-gutter);';
    const { text: out, count } = applyReplacements(text);
    expect(out).toBe(text);
    expect(count).toBe(0);
  });

  it('does NOT touch the non-deprecated component.medium or subgrid tokens', () => {
    const text =
      'gap: var(--semantic-space-component-medium); x: var(--semantic-space-subgrid-gap);';
    const { count } = applyReplacements(text);
    expect(count).toBe(0);
  });

  it('leaves gap/padding prop VALUES alone (public API surface, not a token reference)', () => {
    const text = '<Stack gap="tight"><Card padding="component" /></Stack>';
    const { text: out, count } = applyReplacements(text);
    expect(out).toBe(text);
    expect(count).toBe(0);
  });

  it('is a no-op on text with nothing to migrate', () => {
    const text = 'gap: var(--semantic-space-scale-md);';
    const { text: out, count } = applyReplacements(text);
    expect(out).toBe(text);
    expect(count).toBe(0);
  });

  it('is idempotent: running twice is the same as running once', () => {
    const original = [
      'gap: var(--semantic-space-layout-tight);',
      'padding: hds.semantic.space.component.padding,',
      "tokenPath: 'semantic.space.layout.gutter',",
    ].join('\n');
    const once = applyReplacements(original);
    const twice = applyReplacements(once.text);
    expect(twice.text).toBe(once.text);
    expect(twice.count).toBe(0);
  });
});

describe('REPLACEMENTS table', () => {
  it('never has a canonical (scale.*) string as a search key', () => {
    for (const [search] of REPLACEMENTS) {
      expect(search).not.toMatch(/scale-(xs|sm|md|lg|xl)/);
      expect(search).not.toMatch(/scale\.(xs|sm|md|lg|xl)/);
    }
  });

  it('has no search string that is a substring of another search string', () => {
    const searches = REPLACEMENTS.map(([s]) => s);
    for (const a of searches) {
      for (const b of searches) {
        if (a === b) continue;
        expect(b.includes(a)).toBe(false);
      }
    }
  });
});

describe('rewriteFile', () => {
  it('rewrites a file that is not on the skip list', () => {
    expect(
      rewriteFile('src/app/components/example.tsx', 'gap: var(--semantic-space-layout-tight);'),
    ).toEqual({ text: 'gap: var(--semantic-space-scale-sm);', count: 1 });
  });

  // Box sx's deprecated 'tight' | 'normal' | 'inset' | 'spacious' read the
  // fixed layout vars until 1.0; the scale steps would tighten them under
  // compact density. box-sx.ts spells the vars out so grep and the token
  // usage map see them, so the codemod has to skip it (and its test).
  it.each(['src/app/components/box-sx.ts', 'src/app/components/box-sx.test.ts'])(
    'leaves %s and its literal layout vars alone',
    (rel) => {
      const text = readFileSync(join(ROOT, rel), 'utf8');
      for (const step of ['tight', 'normal', 'inset', 'spacious']) {
        expect(text).toContain(`'var(--semantic-space-layout-${step})'`);
      }
      expect(rewriteFile(rel, text)).toEqual({ text, count: 0 });
    },
  );
});
