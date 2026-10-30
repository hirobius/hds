/**
 * scripts/lib/public-data-attributes.mjs (hds#960): each component's declared
 * public data-* attributes, held to what docs/baselines/dom-a11y.json records
 * its demo rendering, and projected into public/hds-manifest.json.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PUBLIC_DATA_ATTRIBUTES,
  checkPublicDataAttributes,
  demoDataAttributes,
  formatViolation,
  isPublicDataAttribute,
  sourceDataAttributes,
} from '../lib/public-data-attributes.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const readJson = (rel) => JSON.parse(readFileSync(join(REPO, rel), 'utf8'));

const baseline = {
  Button: { dom: ['button data-hover-effect="wipe"'] },
  Card: {
    dom: ['div data-tone="neutral" data-variant="soft"', '  button data-hover-effect="wipe"'],
  },
};
const sources = { Card: "<div data-variant={variant} data-tone={tone} data-hds-component='Card'>" };

describe('isPublicDataAttribute', () => {
  it('excludes data-hds-*, data-radix-* and data-testid', () => {
    expect(isPublicDataAttribute('data-state')).toBe(true);
    expect(isPublicDataAttribute('data-hds-metrics')).toBe(false);
    expect(isPublicDataAttribute('data-radix-collection-item')).toBe(false);
    expect(isPublicDataAttribute('data-testid')).toBe(false);
    expect(isPublicDataAttribute('aria-hidden')).toBe(false);
  });
});

describe('demoDataAttributes', () => {
  it('reads valued and bare attributes, public only, sorted, not inside values', () => {
    expect(
      demoDataAttributes([
        'svg aria-hidden="true" data-hds-icon',
        '  span data-tone="x data-fake y" data-active',
      ]),
    ).toEqual(['data-active', 'data-tone']);
  });
});

describe('sourceDataAttributes', () => {
  it('skips comments', () => {
    expect(sourceDataAttributes('/* data-x= */ // data-y: z\n<a data-z={1} />')).toEqual([
      'data-z',
    ]);
  });

  it('reads JSX attributes, object keys and dataset writes', () => {
    expect(
      sourceDataAttributes(
        `<i data-size={s} />; const p = { 'data-slot': 'x' }; el.dataset['token'] = t; el.dataset.themeState = v;`,
      ),
    ).toEqual(['data-size', 'data-slot', 'data-theme-state', 'data-token']);
  });
});

describe('checkPublicDataAttributes', () => {
  it('passes when every declared attribute is rendered and every rendered one is claimed', () => {
    const declared = { Card: ['data-tone', 'data-variant'], Button: ['data-hover-effect'] };
    expect(checkPublicDataAttributes({ declared, baseline, sources })).toEqual([]);
  });

  it('fails a declared attribute missing from the baseline (fixture)', () => {
    const declared = {
      Card: ['data-tone', 'data-variant', 'data-size'],
      Button: ['data-hover-effect'],
    };
    expect(checkPublicDataAttributes({ declared, baseline, sources })).toEqual([
      { component: 'Card', attribute: 'data-size', rule: 'not-in-demo' },
    ]);
  });

  it('fails a declaration for a component with no demo', () => {
    const declared = { Card: ['data-tone', 'data-variant'], Button: ['data-hover-effect'] };
    expect(
      checkPublicDataAttributes({
        declared: { ...declared, Ghost: ['data-x'] },
        baseline,
        sources,
      }),
    ).toEqual([{ component: 'Ghost', attribute: 'data-x', rule: 'not-in-demo' }]);
  });

  it('fails a rendered attribute the component writes but does not declare', () => {
    const declared = { Card: ['data-variant'], Button: ['data-hover-effect'] };
    expect(checkPublicDataAttributes({ declared, baseline, sources })).toEqual([
      { component: 'Card', attribute: 'data-tone', rule: 'undeclared' },
    ]);
  });

  it('fails a rendered attribute no component declares', () => {
    const declared = { Card: ['data-tone', 'data-variant'] };
    expect(checkPublicDataAttributes({ declared, baseline, sources })).toEqual([
      { component: 'Button', attribute: 'data-hover-effect', rule: 'unclaimed' },
      { component: 'Card', attribute: 'data-hover-effect', rule: 'unclaimed' },
    ]);
  });

  it('names the fix', () => {
    expect(
      formatViolation({ component: 'Card', attribute: 'data-size', rule: 'not-in-demo' }),
    ).toMatch(/Card: `data-size` is declared.*pnpm manifest:generate/);
  });
});

describe('the repo', () => {
  const manifest = readJson('public/hds-manifest.json');
  const specs = { ...manifest.componentSpecs, ...manifest.utilities };

  it('declares only what the demos render, and every rendered public data-* attribute', () => {
    const repoBaseline = readJson('docs/baselines/dom-a11y.json');
    const repoSources = Object.fromEntries(
      Object.keys(repoBaseline).map((name) => {
        expect(specs[name]?.filePath, `${name} has a demo but no manifest spec`).toBeTruthy();
        return [name, readFileSync(join(REPO, specs[name].filePath), 'utf8')];
      }),
    );
    const violations = checkPublicDataAttributes({
      declared: PUBLIC_DATA_ATTRIBUTES,
      baseline: repoBaseline,
      sources: repoSources,
    });
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('lists are sorted and unique', () => {
    for (const [name, list] of Object.entries(PUBLIC_DATA_ATTRIBUTES)) {
      expect(list, name).toEqual([...new Set(list)].sort());
    }
  });

  it('public/hds-manifest.json carries each list as publicDataAttributes (pnpm manifest:generate)', () => {
    for (const [name, spec] of Object.entries(specs)) {
      expect(spec.publicDataAttributes, name).toEqual(PUBLIC_DATA_ATTRIBUTES[name] ?? []);
    }
  });
});
