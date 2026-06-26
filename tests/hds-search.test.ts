/**
 * Tests for src/app/lib/hds-search.ts — the search engine extracted from
 * CommandPalette (ADR-011 review). Previously only reachable via a __test__
 * export hook on the component; now a pure module tested directly.
 */
import { describe, it, expect } from 'vitest';
import {
  sanitize,
  buildIndex,
  fuzzyScore,
  rank,
  MAX_RESULTS,
  type SystemManifest,
  type PaletteResult,
} from '../src/app/lib/hds-search';

describe('sanitize', () => {
  it('strips long hex / signature / bearer noise and collapses whitespace', () => {
    expect(sanitize('Button   abcdef0123456789abcdef0123456789ab token')).toBe('Button token');
    expect(sanitize('x sig=AAAABBBBCCCC y')).toBe('x y');
    expect(sanitize('Bearer abcdefgh12345678 done')).toBe('done');
  });
  it('is a no-op on clean text', () => {
    expect(sanitize('Compact metadata chip')).toBe('Compact metadata chip');
  });
});

describe('fuzzyScore', () => {
  it('returns 0 for an empty query and -Infinity for a non-subsequence', () => {
    expect(fuzzyScore('', 'anything')).toBe(0);
    expect(fuzzyScore('zzz', 'button')).toBe(-Infinity);
  });
  it('matches a subsequence and rewards word-start + adjacency', () => {
    expect(fuzzyScore('btn', 'button group')).toBeGreaterThan(0);
    // contiguous prefix at a word start should beat a scattered match
    const contiguous = fuzzyScore('but', 'button');
    const scattered = fuzzyScore('but', 'xbxuxt');
    expect(contiguous).toBeGreaterThan(scattered);
  });
  it('prefers earlier matches', () => {
    expect(fuzzyScore('a', 'a___')).toBeGreaterThan(fuzzyScore('a', '___a'));
  });
});

const MANIFEST: SystemManifest = {
  componentSpecs: {
    Button: { tier: 'primitive', category: 'Actions', description: 'Primary action' },
    HiddenThing: { tier: 'primitive', category: 'Actions', hidden: true },
    ExemptThing: { tier: 'primitive', category: 'Actions', docExempt: true },
    CardRail: { tier: 'pattern', category: 'Display', description: 'A rail' },
    NoTier: { category: 'Actions', description: 'no tier → no route' },
  },
  utilities: {
    Stack: { description: 'layout helper' },
    HiddenUtil: { description: 'nope', hidden: true },
  },
  tokens: {
    role: {
      surfacePage: { path: 'semantic.color.surface.page', cssVar: '--x', description: 'page bg' },
    },
  },
};

describe('buildIndex', () => {
  const index = buildIndex(MANIFEST);
  const ids = (i: PaletteResult[]) => i.map((r) => r.id);

  it('includes visible specs, utilities, tokens, and foundation sections', () => {
    expect(ids(index)).toEqual(
      expect.arrayContaining(['spec:Button', 'util:Stack', 'token:semantic.color.surface.page']),
    );
    expect(index.some((r) => r.kind === 'section')).toBe(true);
  });
  it('skips hidden, docExempt, and tier-less specs', () => {
    const set = new Set(ids(index));
    expect(set.has('spec:HiddenThing')).toBe(false);
    expect(set.has('spec:ExemptThing')).toBe(false);
    expect(set.has('spec:NoTier')).toBe(false);
    expect(set.has('util:HiddenUtil')).toBe(false);
  });
  it('routes by tier/category and tags kind', () => {
    const btn = index.find((r) => r.id === 'spec:Button')!;
    expect(btn.kind).toBe('component');
    expect(btn.to).toBe('/components/actions#Button');
    const rail = index.find((r) => r.id === 'spec:CardRail')!;
    expect(rail.kind).toBe('pattern');
    expect(rail.to).toBe('/patterns/CardRail');
  });
  it('is pure — no global state, same input → same output', () => {
    expect(buildIndex(MANIFEST)).toEqual(index);
  });
});

describe('rank', () => {
  const index = buildIndex(MANIFEST);
  it('empty query returns a stable starter set with sections first', () => {
    const r = rank('', index);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].kind).toBe('section');
  });
  it('filters out non-matches and ranks by score', () => {
    const r = rank('button', index);
    expect(r[0].id).toBe('spec:Button');
    expect(r.every((x) => x.haystack.includes('b'))).toBe(true);
  });
  it('caps at MAX_RESULTS', () => {
    const many = Array.from({ length: MAX_RESULTS + 20 }, (_, i) => ({
      id: `x${i}`,
      label: `button${i}`,
      description: '',
      kind: 'component' as const,
      to: '/',
      haystack: `button${i}`,
    }));
    expect(rank('button', many).length).toBe(MAX_RESULTS);
  });
});
