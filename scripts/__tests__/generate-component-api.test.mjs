/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Regression gate for hds#334: Radix passthrough props and the Table
 * cell-slot vocabulary must reach component-api.json. Lower bounds and named
 * props only, so a Radix upgrade does not break the suite.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { buildManifest } from '../generate-component-api.mjs';

let components;

beforeAll(() => {
  components = buildManifest().components;
}, 120_000);

const names = (component) => (components[component]?.props ?? []).map((row) => row.name);

describe('generate-component-api: Radix passthrough props', () => {
  const required = {
    Menu: ['children', 'dir', 'open', 'defaultOpen', 'onOpenChange', 'modal'],
    Popover: ['children', 'open', 'defaultOpen', 'onOpenChange', 'modal'],
    AlertDialog: ['children', 'open', 'defaultOpen', 'onOpenChange'],
    Tabs: ['value', 'defaultValue', 'onValueChange', 'orientation', 'activationMode'],
    Dialog: ['onOpenChange'],
  };

  for (const [component, expected] of Object.entries(required)) {
    it(`${component} lists ${expected.join(', ')}`, () => {
      expect(names(component)).toEqual(expect.arrayContaining(expected));
    });
  }

  it('Tabs value is optional and described (taken from Radix, not a same-named trigger prop)', () => {
    const row = components.Tabs.props.find((r) => r.name === 'value');
    expect(row.required).toBe(false);
    expect(row.description).not.toBe('');
  });

  // HoverCard and ContextMenu held this case until 0.20.0 removed them (hds#394).
  it('Tooltip has at least 4 rows', () => {
    expect(names('Tooltip').length).toBeGreaterThanOrEqual(4);
  });

  it('does not leak React/DOM attribute rows', () => {
    for (const component of ['Menu', 'Popover', 'AlertDialog', 'Tabs', 'Tooltip', 'Dialog']) {
      for (const name of names(component)) {
        expect(['className', 'style', 'onClick']).not.toContain(name);
        expect(name.startsWith('aria-')).toBe(false);
      }
    }
  });
});

describe('generate-component-api: Table cellSlots', () => {
  it('descriptions carry no Markdown backticks (rendered as plain text)', () => {
    for (const slot of components.Table.cellSlots) expect(slot.description).not.toContain('`');
  });

  it('lists the nine TableCellSlot names in order with descriptions', () => {
    const slots = components.Table?.cellSlots ?? [];
    expect(slots.map((slot) => slot.name)).toEqual([
      'label',
      'value',
      'description',
      'token',
      'code',
      'custom',
      'icon',
      'badge',
      'action',
    ]);
    for (const slot of slots) expect(slot.description.length).toBeGreaterThan(0);
    expect(slots.find((slot) => slot.name === 'value').description).toContain('monospace');
  });
});

/**
 * hds#406: a prop typed by a named alias used to be recorded as the alias name
 * (`InputSize`, `GapOption`, `PaddingOption`), so agents reading
 * component-api.json or the manifest lost the legal values. The checker now
 * expands any alias that is a pure string-literal union.
 */
describe('generate-component-api: named alias expansion (hds#406)', () => {
  const type = (component, prop) =>
    components[component]?.props.find((row) => row.name === prop)?.type;
  const literals = (text) =>
    [...String(text).matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);

  it('expands a NonNullable<VariantProps<…>> alias (Input.size) to its literals', () => {
    expect(type('Input', 'size')).not.toBe('InputSize');
    expect(literals(type('Input', 'size')).sort()).toEqual(['lg', 'md', 'sm']);
  });

  it('expands an imported alias (Card.padding, Surface.padding) to its literals', () => {
    for (const component of ['Card', 'Surface']) {
      expect(literals(type(component, 'padding')).sort()).toEqual(
        ['component', 'item', 'none', 'px16', 'px24'].sort(),
      );
    }
  });

  it('expands a union of aliases plus keyof typeof (Stack.gap, Card.gap)', () => {
    for (const component of ['Stack', 'Card']) {
      expect(type(component, 'gap')).not.toBe('GapOption');
      expect(literals(type(component, 'gap'))).toEqual(
        expect.arrayContaining(['tight', 'normal', 'inset', 'spacious']),
      );
    }
  });

  it('lists the values in source order, not checker order', () => {
    expect(literals(type('Stack', 'gap')).slice(0, 5)).toEqual([
      'tight',
      'normal',
      'inset',
      'spacious',
      'gap',
    ]);
    expect(literals(type('Card', 'padding'))).toEqual([
      'component',
      'item',
      'px16',
      'px24',
      'none',
    ]);
    const space = literals(type('Card', 'gap')).filter((value) => value.startsWith('px'));
    expect(space.slice(0, 3)).toEqual(['px1', 'px2', 'px4']);
  });

  it('keeps an alias name that is not a pure string-literal union', () => {
    expect(type('Stack', 'children')).toBe('ReactNode');
    expect(type('Stack', 'style')).toBe('CSSProperties');
  });

  it('leaves no bare alias name behind that resolves to string literals', () => {
    const bare = [];
    for (const [name, component] of Object.entries(components)) {
      for (const row of component.props) {
        if (/^(InputSize|GapOption|PaddingOption)$/.test(row.type))
          bare.push(`${name}.${row.name}`);
      }
    }
    expect(bare).toEqual([]);
  });
});
