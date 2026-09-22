/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/figma-disposition.mjs.
 *
 * This decides which components a Figma-parity gate is allowed to call
 * missing, so a wrong class here is worse than no class at all: mark a real
 * component `slot` and its absence from the library becomes invisible.
 *
 * Each rule below exists because the naive version of it was wrong on this
 * repo's actual data — the classifier reported 85/44 before the corrections
 * these tests pin, and 86/39 after.
 */

import { describe, it, expect } from 'vitest';
import { classify, collectSlotMembers, buildDisposition } from '../figma-disposition.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const noSlots = new Map();

describe('classify', () => {
  it('calls a plain visual component library', () => {
    expect(classify('Badge', { tier: 'primitive', category: 'Display' }, noSlots)).toBe('library');
  });

  it('calls a compound member a slot', () => {
    const slots = new Map([['CardHeader', 'Card']]);
    expect(classify('CardHeader', { tier: 'primitive', category: 'Display' }, slots)).toBe('slot');
  });

  it('calls an unlinked layout primitive layout', () => {
    expect(classify('Cluster', { tier: 'primitive', category: 'Layout' }, noSlots)).toBe('layout');
  });

  it('does NOT call a linked Layout component invisible', () => {
    // Divider draws a line, Surface is a visual container, Disclosure has a
    // chevron — all three are category:Layout and all three already have a
    // Figma node. Trusting the category alone classed them as invisible
    // primitives and produced three "linked but shouldn't be" anomalies.
    const spec = { tier: 'primitive', category: 'Layout', figmaUrl: 'https://figma.com/x' };
    expect(classify('Divider', spec, noSlots)).toBe('library');
  });

  it('calls a slot that Figma publishes anyway a library component', () => {
    // Card.Progress and Card.Metric are compound parts by the source's shape,
    // but the library has a real COMPONENT for each (128:14, 128:18). They are
    // not missing, so a gate must not chase them.
    const slots = new Map([['CardProgress', 'Card']]);
    const mapped = new Set(['CardProgress']);
    expect(
      classify('CardProgress', { tier: 'primitive', category: 'Display' }, slots, mapped),
    ).toBe('library');
  });

  it('calls hidden, utility and template components internal', () => {
    expect(classify('X', { tier: 'primitive', category: 'Display', hidden: true }, noSlots)).toBe(
      'internal',
    );
    expect(classify('X', { tier: 'utility', category: 'Display' }, noSlots)).toBe('internal');
    expect(classify('X', { tier: 'template', category: 'Display' }, noSlots)).toBe('internal');
    expect(classify('X', { tier: 'primitive', category: 'Compiler' }, noSlots)).toBe('internal');
  });
});

describe('collectSlotMembers (real source)', () => {
  const slots = collectSlotMembers(path.join(ROOT, 'src/app/components'));

  it('finds namespaced compounds like Card.Header = CardHeader', () => {
    expect(slots.get('CardHeader')).toBe('Card');
    expect(slots.get('CardFooter')).toBe('Card');
  });

  it('finds flat compounds that never use the namespace', () => {
    // tabs.tsx exports Tabs, TabsList, TabsTrigger and TabsContent as four
    // siblings with no `Tabs.List = ...` anywhere, so reading only the
    // namespaced form missed all three parts. Figma publishes two assets for
    // that page, not four.
    expect(slots.get('TabsList')).toBe('Tabs');
    expect(slots.get('TabsTrigger')).toBe('Tabs');
    expect(slots.get('TabsContent')).toBe('Tabs');
  });

  it('does not pair components that merely share a name prefix across files', () => {
    // TextLockup must not become a part of Text: the prefix rule only applies
    // to exports of the same module.
    expect(slots.get('TextLockup')).toBeUndefined();
  });
});

describe('buildDisposition (real repo)', () => {
  const { summary, components } = buildDisposition();

  it('classifies every component exactly once', () => {
    const counted = Object.values(summary.byClass).reduce((a, b) => a + b, 0);
    expect(counted).toBe(summary.total);
    expect(summary.total).toBe(components.length);
  });

  it('leaves nothing linked to Figma that it says does not belong there', () => {
    // The tell that a class is wrong: a node exists for something the table
    // claims should have none. Any non-zero value here is a real disagreement
    // between this file and the published library, not a rounding error.
    expect(summary.unexpectedlyLinked).toBe(0);
  });

  it('reports a library target smaller than the raw component count', () => {
    // The whole point: `figma:links --check` measures 139 and reports a
    // 95-component hole. The honest denominator is smaller.
    expect(summary.byClass.library).toBeLessThan(summary.total);
    expect(summary.byClass.library).toBeGreaterThan(50);
  });
});
