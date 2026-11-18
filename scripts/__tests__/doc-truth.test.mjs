/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Doc truth (Fable eval #1). The generated rule documents taught a deprecated
 * component (MetricTiles as "the default… start here") and a Button that does not
 * exist ("secondary (outline)"). These tests pin the guard and the shipped files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  deprecatedNames,
  findDeprecatedRecommendations,
  loadDeprecatedNames,
} from '../lib/doc-truth.mjs';
import { BUTTON_VARIANT_LOOK, buttonVariantsSentence } from '../build-design-md.mjs';

const ROOT = resolve(__dirname, '../..');
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

const names = deprecatedNames({
  exports: [
    { kind: 'export', name: 'MetricTiles' },
    { kind: 'export', name: 'CardMetric' },
    { kind: 'export', name: 'MetricTilesProps', typeOnly: true },
  ],
  propValues: [{ kind: 'propValue', name: 'heading3', owner: 'TextVariant' }],
});

describe('findDeprecatedRecommendations', () => {
  it('flags a deprecated export, a compound part and a deprecated Text variant', () => {
    const text = [
      '| `MetricTiles` | Nothing: start here. |',
      'A metric inside a card is `Card.Metric`.',
      'Card title: `heading3`.',
      'Import: `import { MetricTiles } from "@hirobius/design-system/patterns";`',
    ].join('\n');
    expect(findDeprecatedRecommendations(text, names).map((h) => h.name)).toEqual([
      'MetricTiles',
      'Card.Metric',
      'heading3',
      'MetricTiles',
    ]);
  });

  it('allows a name in an avoid list, a migration note and a migration section', () => {
    const text = [
      '- **Row of numbers** → `Grid`, `Card`. Not: `MetricTiles`, `CardMetric`.',
      '`MetricTiles` is deprecated: compose a Card.',
      '## Removed exports',
      '| `MetricTiles` | Card | 1.0.0 |',
      '## Next',
      'Use `Card`.',
    ].join('\n');
    expect(findDeprecatedRecommendations(text, names)).toEqual([]);
  });

  it('ignores type-only exports and words that only contain a deprecated name', () => {
    expect(
      findDeprecatedRecommendations('`MetricTilesProps` and `MetricTilesGrid`', names),
    ).toEqual([]);
  });
});

describe('the shipped rule documents', () => {
  const live = loadDeprecatedNames(ROOT);
  it.each(['DESIGN.md', 'public/llms.txt', 'public/llms-full.txt', 'AGENTS.md'])(
    '%s recommends no deprecated API',
    (rel) => {
      expect(findDeprecatedRecommendations(read(rel), live)).toEqual([]);
    },
  );

  it('DESIGN.md describes the secondary Button as it renders (no outline)', () => {
    const design = read('DESIGN.md');
    expect(design).not.toMatch(/secondary \(outline\)/);
    expect(design).toContain('`secondary` (soft tonal fill, no border; the default)');
  });
});

describe('buttonVariantsSentence', () => {
  const manifest = (values) => ({ componentSpecs: { Button: { props: { variant: { values } } } } });

  it('lists every manifest variant with its look', () => {
    const sentence = buttonVariantsSentence(manifest(Object.keys(BUTTON_VARIANT_LOOK)));
    for (const v of Object.keys(BUTTON_VARIANT_LOOK)) expect(sentence).toContain(`\`${v}\``);
  });

  it('fails when the manifest adds or drops a variant', () => {
    expect(() =>
      buttonVariantsSentence(manifest(['primary', 'secondary', 'tertiary', 'link', 'outline'])),
    ).toThrow(/missing: outline/);
    expect(() => buttonVariantsSentence(manifest(['primary', 'secondary']))).toThrow(
      /stale: tertiary, link/,
    );
  });

  it('matches the shipped manifest', () => {
    expect(() =>
      buttonVariantsSentence(JSON.parse(read('public/hds-manifest.json'))),
    ).not.toThrow();
  });
});
