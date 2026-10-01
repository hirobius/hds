/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#390 step 6: enrich-manifest refreshes each spec's `props` and
 * `propConstraints` from src/app/data/component-api.json on every run. It
 * used to fill them only when absent, so a prop whose type changed in code
 * kept its first-seen manifest type for good (Stack.wrap stayed `boolean`
 * after the code moved to FlexWrap).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePropType, refreshSpecProps } from '../lib/manifest-props.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

describe('normalizePropType', () => {
  it('reads a cva literal union as an enum, ignoring null and undefined', () => {
    expect(normalizePropType('"primary" | "secondary" | "tertiary" | null')).toEqual({
      type: 'enum',
      values: ['primary', 'secondary', 'tertiary'],
    });
    expect(normalizePropType('NonNullable<"sm" | "md" | null> | undefined')).toEqual({
      type: 'enum',
      values: ['sm', 'md'],
    });
  });

  it('unwraps a parenthesised function type and keeps unions inside its parameters', () => {
    expect(normalizePropType('((open: boolean) => void)')).toEqual({
      type: '(open: boolean) => void',
    });
    expect(normalizePropType('((date: Date) => void) | undefined')).toEqual({
      type: '(date: Date) => void',
    });
    expect(normalizePropType('(value: "a" | "b") => void')).toEqual({
      type: '(value: "a" | "b") => void',
    });
  });

  it('keeps a named type as written, and maps the primitives', () => {
    expect(normalizePropType('FlexWrap')).toEqual({ type: 'FlexWrap' });
    expect(normalizePropType('boolean')).toEqual({ type: 'boolean' });
    expect(normalizePropType('string | null')).toEqual({ type: 'string' });
    expect(normalizePropType('number')).toEqual({ type: 'number' });
  });
});

describe('refreshSpecProps', () => {
  const api = {
    props: [
      { name: 'wrap', type: 'FlexWrap', required: false },
      { name: 'gap', type: '"tight" | "normal" | null', default: 'tight', required: false },
    ],
  };

  it('rebuilds props from component-api, dropping props the code no longer has', () => {
    const spec = {
      props: { wrap: { type: 'boolean', default: false }, gone: { type: 'string' } },
      propConstraints: { wrap: { type: 'boolean' }, gone: { type: 'string' } },
      requiredProps: [],
    };
    const out = refreshSpecProps(spec, api, { derive: true });
    expect(out.props).toEqual({
      wrap: { type: 'FlexWrap', optional: true },
      gap: { type: 'enum', values: ['tight', 'normal'], default: 'tight' },
    });
    expect(out.propConstraints).toEqual({ gap: { type: 'enum', values: ['tight', 'normal'] } });
  });

  it('keeps hand-kept constraints of a non-derived spec only for props that still exist', () => {
    const spec = {
      props: {},
      propConstraints: { gap: { type: 'string' }, gone: { type: 'string' } },
    };
    expect(refreshSpecProps(spec, api, { derive: false }).propConstraints).toEqual({
      gap: { type: 'string' },
    });
  });

  it('leaves a spec with no component-api props as it is', () => {
    const spec = { props: { a: { type: 'string' } }, propConstraints: { a: { type: 'string' } } };
    expect(refreshSpecProps(spec, undefined, { derive: true })).toEqual({
      props: spec.props,
      propConstraints: spec.propConstraints,
    });
    expect(refreshSpecProps(spec, { props: [] }, { derive: true }).props).toBe(spec.props);
  });
});

describe('committed manifest', () => {
  const manifest = read('public/hds-manifest.json');
  const api = read('src/app/data/component-api.json').components;

  it('types Stack.wrap as the code does (FlexWrap), not boolean', () => {
    expect(manifest.componentSpecs.Stack.props.wrap.type).toBe('FlexWrap');
    expect(manifest.componentSpecs.Stack.propConstraints.wrap).toBeUndefined();
  });

  it('lists exactly the component-api props for every spec that has an api entry', () => {
    const drift = Object.entries(manifest.componentSpecs)
      .filter(([name]) => api[name]?.props?.length)
      .filter(([name, spec]) => {
        const want = api[name].props.map((p) => p.name).sort();
        return JSON.stringify(Object.keys(spec.props).sort()) !== JSON.stringify(want);
      })
      .map(([name]) => name);
    expect(drift).toEqual([]);
  });
});
