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

  it('HoverCard and ContextMenu have at least 4 rows each', () => {
    expect(names('HoverCard').length).toBeGreaterThanOrEqual(4);
    expect(names('ContextMenu').length).toBeGreaterThanOrEqual(4);
  });

  it('does not leak React/DOM attribute rows', () => {
    for (const component of [
      'Menu',
      'Popover',
      'AlertDialog',
      'Tabs',
      'HoverCard',
      'ContextMenu',
      'Dialog',
    ]) {
      for (const name of names(component)) {
        expect(['className', 'style', 'onClick']).not.toContain(name);
        expect(name.startsWith('aria-')).toBe(false);
      }
    }
  });
});

describe('generate-component-api: Table cellSlots', () => {
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
