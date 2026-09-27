/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/codemod-spacing-vocabulary.mjs (hds#206 remaining work).
 *
 * All tests operate purely in memory — no filesystem reads or writes.
 */

import { describe, it, expect } from 'vitest';
import { applyReplacements, REPLACEMENTS } from '../codemod-spacing-vocabulary.mjs';

describe('applyReplacements', () => {
  it('rewrites a CSS var() consumption site to the canonical scale token', () => {
    const { text, count } = applyReplacements('gap: var(--semantic-space-layout-tight);');
    expect(text).toBe('gap: var(--semantic-space-scale-sm);');
    expect(count).toBe(1);
  });

  it('rewrites all four deprecated layout var() names', () => {
    const cases = [
      ['var(--semantic-space-layout-tight)', 'var(--semantic-space-scale-sm)'],
      ['var(--semantic-space-layout-normal)', 'var(--semantic-space-scale-md)'],
      ['var(--semantic-space-layout-gutter)', 'var(--semantic-space-scale-md)'],
      ['var(--semantic-space-layout-inset)', 'var(--semantic-space-scale-lg)'],
      ['var(--semantic-space-layout-spacious)', 'var(--semantic-space-scale-xl)'],
      ['var(--semantic-space-component-gap)', 'var(--semantic-space-scale-xs)'],
      ['var(--semantic-space-component-padding)', 'var(--semantic-space-scale-md)'],
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
    const text = "tokenPath: 'semantic.space.component.padding',";
    expect(applyReplacements(text).text).toBe("tokenPath: 'semantic.space.scale.md',");
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
    const text = '--semantic-space-layout-gutter: 32px;';
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
