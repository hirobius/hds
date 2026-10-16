import { describe, it, expect } from 'vitest';
import { applyRatchet, findCoverageGaps } from '../lib/docs-coverage.mjs';

const base = {
  components: ['A'],
  pageFor: () => '/docs/components/a',
  demos: new Set(['A']),
  figmaFor: () => 'https://figma.com/x',
};

describe('findCoverageGaps', () => {
  it('is clean when page, demo and Figma link exist', () => {
    expect(findCoverageGaps(base)).toEqual([]);
  });
  it('flags no-page', () => {
    expect(findCoverageGaps({ ...base, pageFor: () => null })).toEqual([
      { name: 'A', gap: 'no-page' },
    ]);
  });
  it('flags no-demo', () => {
    expect(findCoverageGaps({ ...base, demos: new Set() })).toEqual([
      { name: 'A', gap: 'no-demo' },
    ]);
  });
  it('flags no-figma-link', () => {
    expect(findCoverageGaps({ ...base, figmaFor: () => null })).toEqual([
      { name: 'A', gap: 'no-figma-link' },
    ]);
  });
});

describe('applyRatchet', () => {
  const gaps = [{ name: 'A', gap: 'no-demo' }];
  it('passes when every gap is allowlisted', () => {
    expect(applyRatchet(gaps, ['A:no-demo'])).toEqual({ newGaps: [], stale: [] });
  });
  it('fails on a new gap', () => {
    expect(applyRatchet(gaps, []).newGaps).toEqual(gaps);
  });
  it('fails on a stale allowlist entry', () => {
    expect(applyRatchet([], ['A:no-demo']).stale).toEqual(['A:no-demo']);
  });
});
