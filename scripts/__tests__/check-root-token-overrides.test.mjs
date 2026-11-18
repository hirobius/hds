/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * One winner per token (folio #429): a hand-written top-level :root in src/styles
 * re-declared semantic.space.section.inset (128px vs the token's 96px) and three
 * sidebar spacings, so the token value lost once styles.css loaded and a consumer
 * saw a layout shift. The check fails on a top-level :root that re-declares a
 * generated token with a different value. A rule inside @media or under a
 * selector such as [data-density] is a deliberate variant and is allowed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { topLevelRootDecls, findRootOverrides } from '../check-root-token-overrides.mjs';

const GENERATED = `:root {
  --semantic-space-section-inset: var(--primitive-space-24);
  --semantic-space-sidebar-gap: var(--primitive-space-4);
}
[data-density='compact'] { --semantic-space-sidebar-gap: var(--primitive-space-3); }`;

describe('topLevelRootDecls', () => {
  it('reads custom properties from a top-level :root only', () => {
    const css = `${GENERATED}
@media (max-width: 639px) { :root { --semantic-space-section-inset: 80px; } }`;
    expect(topLevelRootDecls(css)).toEqual(
      new Map([
        ['--semantic-space-section-inset', 'var(--primitive-space-24)'],
        ['--semantic-space-sidebar-gap', 'var(--primitive-space-4)'],
      ]),
    );
  });

  it('ignores comments', () => {
    expect(topLevelRootDecls(':root { /* --a: 1; */ --b: 2; /* x */ }')).toEqual(
      new Map([['--b', '2']]),
    );
  });
});

describe('findRootOverrides', () => {
  it('flags a top-level :root that re-declares a token with another value', () => {
    const hand = ':root { --semantic-space-section-inset: var(--primitive-space-32); /* 128px */ }';
    expect(findRootOverrides(GENERATED, [{ file: 'theme.css', css: hand }])).toEqual([
      {
        file: 'theme.css',
        name: '--semantic-space-section-inset',
        token: 'var(--primitive-space-24)',
        found: 'var(--primitive-space-32)',
      },
    ]);
  });

  it('allows the same value, a non-token property and a media-scoped variant', () => {
    const hand = `:root { --semantic-space-sidebar-gap: var(--primitive-space-4); --hds-local: 1px; }
@media (max-width: 639px) { :root { --semantic-space-section-inset: var(--primitive-space-20); } }`;
    expect(findRootOverrides(GENERATED, [{ file: 'theme.css', css: hand }])).toEqual([]);
  });
});

describe('the shipped source', () => {
  it('has no hand-written :root that overrides a generated token', () => {
    const root = resolve(import.meta.dirname, '../..');
    const read = (f) => readFileSync(resolve(root, 'src/styles', f), 'utf8');
    const files = ['theme.css', 'accents.css', 'tenants.css'].map((file) => ({
      file,
      css: read(file),
    }));
    expect(findRootOverrides(read('tokens.generated.css'), files)).toEqual([]);
  });
});
