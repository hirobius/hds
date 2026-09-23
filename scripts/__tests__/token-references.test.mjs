/**
 * The detector's job is to see all three ways HDS names a token. It saw one
 * for a long time, and the damage was invisible: 78 of 128 components recorded
 * zero tokens while plainly being tokenized, and Button recorded nothing but a
 * comment. A silent undercount reads exactly like "this component has no
 * styling", so each route is pinned here, and so is the comment exclusion that
 * caused Button's single false entry.
 */
import { describe, expect, it } from 'vitest';
import {
  flattenColorMap,
  mergeReferences,
  utilityReferences,
  varReferences,
  varToTokenPath,
} from '../lib/token-references.mjs';

const MAP = flattenColorMap({
  foreground: 'var(--role-foreground)',
  card: { DEFAULT: 'var(--role-card)', foreground: 'var(--role-card-foreground)' },
  border: 'var(--role-border)',
  notAToken: '#ff0000',
});

describe('varToTokenPath', () => {
  it('turns a custom property into a dotted token path', () => {
    expect(varToTokenPath('--semantic-color-content-primary')).toBe(
      'semantic.color.content.primary',
    );
  });
});

describe('flattenColorMap', () => {
  it('folds DEFAULT into the parent name', () => {
    expect(MAP.get('card')).toBe('--role-card');
  });

  it('joins nested keys with a dash, matching the utility name', () => {
    expect(MAP.get('card-foreground')).toBe('--role-card-foreground');
  });

  it('ignores a colour that is not a token', () => {
    expect(MAP.has('notAToken')).toBe(false);
  });
});

describe('varReferences', () => {
  it('finds a Tailwind arbitrary value', () => {
    const found = varReferences(`className="text-[color:var(--semantic-color-content-primary)]"`);
    expect(found).toMatchObject([
      {
        tokenPath: 'semantic.color.content.primary',
        raw: 'var(--semantic-color-content-primary)',
        sourceLine: 1,
      },
    ]);
  });

  it('finds several on one line', () => {
    const found = varReferences(`border-[var(--a-b)] bg-[var(--c-d)]`);
    expect(found.map((t) => t.tokenPath)).toEqual(['a.b', 'c.d']);
  });

  it('ignores a token named in a comment', () => {
    expect(varReferences(`// uses var(--semantic-color-content-primary)`)).toEqual([]);
    expect(varReferences(` * var(--semantic-color-border-default)`)).toEqual([]);
  });

  it('reports the real line number', () => {
    expect(varReferences(`a\nb\nvar(--x-y)`)[0].sourceLine).toBe(3);
  });
});

describe('utilityReferences', () => {
  it('resolves a named utility through the colour map', () => {
    const found = utilityReferences(`<div className="bg-card text-foreground" />`, MAP);
    expect(found.map((t) => t.tokenPath).sort()).toEqual(['role.card', 'role.foreground']);
  });

  it('resolves a nested utility name', () => {
    expect(utilityReferences(`className="text-card-foreground"`, MAP)[0].tokenPath).toBe(
      'role.card.foreground',
    );
  });

  it('ignores a utility the config does not map', () => {
    // text-sm is a type scale, not a colour — it must not become a token.
    expect(utilityReferences(`className="text-sm bg-transparent"`, MAP)).toEqual([]);
  });

  it('ignores utilities inside a comment', () => {
    expect(utilityReferences(`// bg-card is applied elsewhere`, MAP)).toEqual([]);
  });

  it('returns nothing when there is no colour map', () => {
    expect(utilityReferences(`className="bg-card"`, new Map())).toEqual([]);
  });
});

describe('mergeReferences', () => {
  const hds = [{ raw: 'hds.typeStyles.ui', tokenPath: 'semantic.typography.small', sourceLine: 1 }];

  it('merges all three routes', () => {
    const merged = mergeReferences([
      hds,
      varReferences(`text-[color:var(--semantic-color-content-primary)]`),
      utilityReferences(`className="bg-card"`, MAP),
    ]);
    expect(merged.map((t) => t.tokenPath)).toEqual([
      'role.card',
      'semantic.color.content.primary',
      'semantic.typography.small',
    ]);
  });

  it('dedupes by resolved path, not by expression', () => {
    // The same token reached two ways is one token, not two rows.
    const merged = mergeReferences([
      varReferences(`bg-[var(--role-card)]`),
      utilityReferences(`className="bg-card"`, MAP),
    ]);
    expect(merged).toHaveLength(1);
  });

  it('drops an entry whose only sighting was a comment', () => {
    // This is the Button case: its one recorded token was inside a comment.
    const merged = mergeReferences([
      [{ raw: 'hds.duration', tokenPath: 'motion.duration', sourceSnippet: '// motion-ok: …' }],
    ]);
    expect(merged).toEqual([]);
  });

  it('sorts stably, so a regenerated artifact does not show phantom drift', () => {
    const a = mergeReferences([varReferences(`var(--z-a) var(--a-z)`)]);
    const b = mergeReferences([varReferences(`var(--a-z) var(--z-a)`)]);
    expect(a.map((t) => t.tokenPath)).toEqual(b.map((t) => t.tokenPath));
    expect(a.map((t) => t.tokenPath)).toEqual(['a.z', 'z.a']);
  });
});

/**
 * The page turns a defect `kind` into a sentence through GAP_LABEL. That map
 * is hand-written and the kinds are emitted by the probe, so adding a detector
 * without adding a label would silently print a raw slug like
 * `zero-size-control` where a reader expects prose. Nothing else would catch
 * it — the page still renders.
 */
describe('defect labels track the probe', () => {
  it('labels every kind the probe can emit', async () => {
    const { GAP_LABEL } = await import('../lib/component-page.mjs');
    const { PROBE_SOURCE } = await import('../lib/rendered-geometry.mjs');
    const emitted = [
      ...new Set([...PROBE_SOURCE.toString().matchAll(/kind: '([a-z-]+)'/g)].map((m) => m[1])),
    ].sort();
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.filter((k) => !(k in GAP_LABEL))).toEqual([]);
  });

  it('has no label for a kind the probe cannot emit', async () => {
    // A stale label is a smaller problem than a missing one, but it still
    // means the two drifted.
    const { GAP_LABEL } = await import('../lib/component-page.mjs');
    const { PROBE_SOURCE } = await import('../lib/rendered-geometry.mjs');
    const emitted = new Set(
      [...PROBE_SOURCE.toString().matchAll(/kind: '([a-z-]+)'/g)].map((m) => m[1]),
    );
    expect(Object.keys(GAP_LABEL).filter((k) => !emitted.has(k))).toEqual([]);
  });
});
