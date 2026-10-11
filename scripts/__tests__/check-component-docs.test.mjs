/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/check-component-docs.mjs.
 *
 * The gate answers one question — "is this component documented?" — and the
 * answer depends entirely on where documentation lives. It used to live in a
 * bespoke 48-page docs site; ADR-018 cut that site and made Storybook the sole
 * component showcase, and the gate was never re-pointed, so it kept scanning 11
 * file paths that no longer exist and reported 0/104 documented: not a coverage
 * finding, an arithmetic certainty. It now reads the docs site's own registries
 * (DEMOS and PREVIEWED_COMPONENTS), so Storybook is not needed for a component
 * to count as documented. A gate that cannot go green measures nothing.
 *
 * These unit tests pin the registry reading to source strings so it is provable
 * without a filesystem, and the integration test at the bottom runs the real
 * check against the committed docs-site.
 */

import { describe, it, expect } from 'vitest';
import {
  collectArrayNames,
  collectCompoundMembers,
  collectObjectKeys,
  documentedFromSources,
  runComponentDocsCheck,
} from '../lib/check-component-docs.mjs';

describe('collectCompoundMembers', () => {
  const members = (text) =>
    Object.fromEntries(
      [...collectCompoundMembers(text)].map(([ns, m]) => [ns, Object.fromEntries(m)]),
    );

  it('reads the property-write shape: Card.Header = CardHeader', () => {
    expect(
      members(`
      export const Card = CardRoot as CardComponent;
      Card.Header = CardHeader;
      Card.Body = CardBody;
      `),
    ).toEqual({ Card: { Header: 'CardHeader', Body: 'CardBody' } });
  });

  it('reads the pure Object.assign shape hds#363 moved the compounds to', () => {
    // `Card.Header = CardHeader` is a top-level property write every bundler
    // keeps, so the compounds are now one pure Object.assign around the root.
    // Same members, same names; this reading has to follow or every part
    // becomes an undocumented "library" component with a fake Figma gap.
    expect(
      members(`
      export const Card: CardComponent = /* @__PURE__ */ Object.assign(CardRoot, {
        Header: CardHeader,
        Body: CardBody,
        // strings are metadata, not members
        displayName: 'Card',
      });
      export const Dialog = /* @__PURE__ */ Object.assign(DialogRoot, {
        Trigger,
        Content: DialogContent,
      }) as DialogComponent;
      `),
    ).toEqual({
      Card: { Header: 'CardHeader', Body: 'CardBody' },
      Dialog: { Trigger: 'Trigger', Content: 'DialogContent' },
    });
  });

  it('reads Object.assign around an inline forwardRef, and merges both shapes', () => {
    expect(
      members(`
      export const Palette = /* @__PURE__ */ Object.assign(
        /* @__PURE__ */ React.forwardRef(function Palette() { return null; }),
        { Item: PaletteItem, displayName: 'Palette' },
      );
      Palette.Group = PaletteGroup;
      `),
    ).toEqual({ Palette: { Item: 'PaletteItem', Group: 'PaletteGroup' } });
  });

  it('ignores an Object.assign that is not a compound declaration', () => {
    expect(
      members(`
      const merged = Object.assign({}, defaults, { Header: CardHeader });
      function f() { const X = Object.assign(Root, { Part }); return X; }
      `),
    ).toEqual({});
  });

  it('returns an empty map for empty input', () => {
    expect(members('')).toEqual({});
  });
});

describe('docs demo registries', () => {
  const previewed = `export const PREVIEWED_COMPONENTS = ['Button', 'Card', 'Badge'] as const;`;
  const demos = `
    export const DEMOS: Record<PreviewedComponent, () => ReactNode> = {
      Button: ButtonDemo,
      Badge: BadgeDemo,
      Orphan: OrphanDemo,
    };
  `;

  it('reads the names an array export lists, through as const', () => {
    expect([...collectArrayNames(previewed, 'PREVIEWED_COMPONENTS')]).toEqual([
      'Button',
      'Card',
      'Badge',
    ]);
    expect(collectArrayNames(previewed, 'OTHER').size).toBe(0);
  });

  it('reads the keys of the DEMOS object, ignoring other exports', () => {
    expect([...collectObjectKeys(demos, 'DEMOS')]).toEqual(['Button', 'Badge', 'Orphan']);
    expect(collectObjectKeys('export const X = { A: 1 };', 'DEMOS').size).toBe(0);
  });

  it('documents a component only when it is both listed and has a demo', () => {
    // Card is listed with no demo; Orphan has a demo nobody lists. Neither is
    // documented: a name without a demo is a broken page, a demo without a name
    // renders nowhere.
    const documented = documentedFromSources({ previewedText: previewed, demosText: demos });
    expect([...documented].sort()).toEqual(['Badge', 'Button']);
  });

  it('counts the providers as documented: their guide is generated', () => {
    const documented = documentedFromSources({
      previewedText: previewed,
      demosText: demos,
      providers: ['ToastProvider'],
    });
    expect(documented.has('ToastProvider')).toBe(true);
  });

  it('documents nothing from empty or unparseable registries rather than throwing', () => {
    expect(documentedFromSources({ previewedText: '', demosText: '' }).size).toBe(0);
    expect(() =>
      documentedFromSources({ previewedText: 'const = = =', demosText: 'const = = =' }),
    ).not.toThrow();
  });
});

describe('runComponentDocsCheck (integration, real repo)', () => {
  const result = runComponentDocsCheck();

  it('finds components to check at all', () => {
    // A gate that finds nothing passes vacuously, and a vacuous pass reads as
    // success. The documented surface is the core set plus the patterns.
    expect(result.total).toBeGreaterThan(30);
  });

  it('measures coverage against a documentation surface that exists', () => {
    // The 0/104 bug: every component undocumented because every page it read
    // had been deleted. Any non-zero coverage proves the gate reads something real.
    expect(result.covered).toBeGreaterThan(0);
  });

  it('reports every core component and pattern as having a live demo', () => {
    expect(result.undocumented).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
