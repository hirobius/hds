/**
 * Type-tests for Combobox `multiple` (hds#393 B3 step 4, ticket b3d).
 * Uses pure tsc --noEmit — no external test library needed.
 *
 * Both arms of the props union must compile: the new multi-select arm
 * (`ComboboxMultipleProps`, `multiple` set, `value: string[]`) and the
 * existing single-select `ComboboxProps`, which must still compile unchanged.
 *
 * Run: tsc --noEmit -p <tsconfig extending tests/types/tsconfig.json that
 * includes this file>. A `.ts` file, so `createElement` stands in for JSX.
 */
import { createElement, type ComponentProps } from 'react';
import {
  Combobox,
  type ComboboxAnyProps,
  type ComboboxMultipleProps,
  type ComboboxOption,
  type ComboboxProps,
} from '../../src/app/components/combobox';

const o: ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
];
const f = (next: string[]) => next.length;
const one = (value: string) => value.length;

type Props = ComponentProps<typeof Combobox>;

// ── Multi-select arm ──────────────────────────────────────────────────────────

// <Combobox multiple value={[]} onChange={f} options={o}> compiles.
createElement(Combobox, { multiple: true, value: [], onChange: f, options: o });
const _multi: Props = { multiple: true, value: [], onChange: f, options: o };

// onChange is contextually typed as string[] once `multiple` is set.
const _multiInline: Props = {
  multiple: true,
  value: ['apple'],
  onChange: (next) => next.map((v) => v.toUpperCase()),
  options: o,
};

// A readonly array (e.g. `as const`) is a valid value.
const _multiReadonly: ComboboxMultipleProps = {
  multiple: true,
  value: ['apple'] as const,
  onChange: f,
  options: o,
};

// The shared props are accepted on the multi arm too.
const _multiFull: ComboboxMultipleProps = {
  multiple: true,
  value: [],
  onChange: f,
  options: o,
  placeholder: 'Pick fruit',
  searchPlaceholder: 'Search fruit',
  emptyMessage: 'No fruit',
  'aria-label': 'Fruit',
  id: 'fruit',
  'aria-describedby': 'fruit-help',
  'aria-invalid': true,
  className: 'w-64',
  disabled: false,
};

// ── Single-select arm (unchanged) ─────────────────────────────────────────────

createElement(Combobox, { value: null, onChange: one, options: o });
const _single: Props = { value: 'apple', onChange: one, options: o };
const _singleProps: ComboboxProps = { value: null, onChange: one, options: o };
const _singleInline: Props = { value: null, onChange: (v) => v.toUpperCase(), options: o };

// `multiple={false}` is the single-select arm, spelled out.
const _singleExplicit: Props = { multiple: false, value: null, onChange: one, options: o };

// Existing single-select type lookups still resolve to the single shapes.
const _singleValue: ComboboxProps['value'] = null;
const _singleOnChange: ComboboxProps['onChange'] = one;

// The union alias holds either arm.
const _anyMulti: ComboboxAnyProps = _multi as ComboboxMultipleProps;
const _anySingle: ComboboxAnyProps = _singleProps;

// ── Negative assertions (deliberate type errors) ──────────────────────────────

// @ts-expect-error — the multi arm takes an array, not a single value
const _multiString: Props = { multiple: true, value: 'apple', onChange: f, options: o };

// @ts-expect-error — the multi arm's onChange receives string[], not string
const _multiOneHandler: Props = { multiple: true, value: [], onChange: one, options: o };

// @ts-expect-error — the single arm takes a string or null, not an array
const _singleArray: Props = { value: [], onChange: one, options: o };

// @ts-expect-error — ComboboxProps is the single arm: `multiple: true` is not allowed
const _singleMultiple: ComboboxProps = { multiple: true, value: null, onChange: one, options: o };

(void _multi, _multiInline, _multiReadonly, _multiFull);
(void _single, _singleProps, _singleInline, _singleExplicit, _singleValue, _singleOnChange);
(void _anyMulti, _anySingle);
(void _multiString, _multiOneHandler, _singleArray, _singleMultiple);
