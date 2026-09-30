/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/check-component-docs.mjs.
 *
 * The gate answers one question — "is this component documented?" — and the
 * answer depends entirely on where documentation lives. It used to live in a
 * bespoke 48-page docs site; ADR-018 cut that site and made Storybook the sole
 * component showcase. The gate was never re-pointed, so it kept scanning 11
 * file paths that no longer exist and reported 0/104 documented: not a coverage
 * finding, an arithmetic certainty. A gate that cannot go green measures
 * nothing.
 *
 * These unit tests pin the story-parsing to source strings so the reading is
 * provable without a filesystem, and the integration test at the bottom runs
 * the real check against the committed stories.
 */

import { describe, it, expect } from 'vitest';
import {
  collectCompoundMembers,
  collectStoryComponentNames,
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

describe('collectStoryComponentNames', () => {
  it('reads the component named by the story meta', () => {
    const names = collectStoryComponentNames(`
      import type { Meta } from '@storybook/react';
      import { Badge } from '../app/components/badge';
      const meta = { title: 'Primitives/badge', component: Badge } satisfies Meta<typeof Badge>;
      export default meta;
    `);
    expect(names.has('Badge')).toBe(true);
  });

  it('also credits sub-components a story imports and renders', () => {
    // card.stories.tsx sets `component: Card` but renders CardHeader and
    // CardBody too. Those are separately discovered components, and a story
    // that renders them is where a consumer sees them work.
    const names = collectStoryComponentNames(`
      import { Card, CardHeader, CardBody } from '../app/components/card';
      const meta = { title: 'Primitives/card', component: Card };
      export default meta;
    `);
    expect([...names].sort()).toEqual(['Card', 'CardBody', 'CardHeader']);
  });

  it('ignores imports from outside the component directory', () => {
    // A story importing test utilities or Storybook types must not make those
    // names count as documented components.
    const names = collectStoryComponentNames(`
      import type { Meta, StoryObj } from '@storybook/react';
      import React from 'react';
      import { MODES } from '../../.storybook/preview';
      import { designParameters } from './design-parameters';
      import { Alert } from '../app/components/alert';
      const meta = { component: Alert };
      export default meta;
    `);
    expect([...names]).toEqual(['Alert']);
  });

  it('ignores type-only imports, which document nothing', () => {
    const names = collectStoryComponentNames(`
      import type { AlertProps } from '../app/components/alert';
      import { Alert } from '../app/components/alert';
      const meta = { component: Alert };
      export default meta;
    `);
    expect([...names]).toEqual(['Alert']);
  });

  it('credits compound members reached through the namespace', () => {
    // card.stories.tsx imports only `Card` and renders <Card.Header>. Card.Header
    // IS CardHeader — card.tsx assigns it — so the story documents CardHeader
    // without ever naming it. Counting only named imports calls five rendered
    // components undocumented.
    const names = collectStoryComponentNames(
      `
      import { Card } from '../app/components/card';
      const meta = { component: Card };
      export const Default = () => (
        <Card><Card.Header /><Card.Body /></Card>
      );
      `,
      'card.stories.tsx',
      (local, member) => (local === 'Card' ? `Card${member}` : null),
    );
    expect([...names].sort()).toEqual(['Card', 'CardBody', 'CardHeader']);
  });

  it('does not credit compound members the story never renders', () => {
    // Card.Progress and Card.Metric exist but appear in no story. The gate has
    // to keep saying so — crediting a whole module because one member is used
    // is how coverage numbers start lying.
    const names = collectStoryComponentNames(
      `
      import { Card } from '../app/components/card';
      export const Default = () => <Card><Card.Header /></Card>;
      `,
      'card.stories.tsx',
      (local, member) => (local === 'Card' ? `Card${member}` : null),
    );
    expect(names.has('CardProgress')).toBe(false);
    expect(names.has('CardMetric')).toBe(false);
  });

  it('returns nothing for a file with no component references', () => {
    expect(collectStoryComponentNames('export const x = 1;').size).toBe(0);
  });

  it('survives a file it cannot make sense of rather than throwing', () => {
    expect(() => collectStoryComponentNames('const = = =')).not.toThrow();
  });
});

describe('runComponentDocsCheck (integration, real repo)', () => {
  const result = runComponentDocsCheck();

  it('finds components to check at all', () => {
    // The 0/104 bug was invisible because the denominator looked healthy. If
    // discovery ever returns nothing, a vacuous pass must not read as success.
    expect(result.total).toBeGreaterThan(50);
  });

  it('measures coverage against a documentation surface that exists', () => {
    // The specific shape of the old failure: every component undocumented
    // because every page it read had been deleted. Any non-zero coverage
    // proves the gate is pointed at something real.
    expect(result.covered).toBeGreaterThan(0);
  });

  it('reports every shipped component as documented', () => {
    expect(result.undocumented).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
