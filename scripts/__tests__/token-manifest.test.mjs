/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildManifest, seedComponentSpecs } from '../lib/token-manifest.mjs';
import { buildManifest as cliBuildManifest } from '../build-tokens.mjs';
import { walkTokens } from '../lib/token-tree.mjs';
import { readTokenSource } from '../lib/token-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('seedComponentSpecs (hds#645)', () => {
  it('lays each seed over the previous spec and passes unseeded specs through', () => {
    const specs = seedComponentSpecs({
      Button: { props: ['variant'], sourcePath: 'old.tsx' },
      Banner: { variantAxes: ['tone'] },
    });
    expect(specs.Button.props).toEqual(['variant']);
    expect(specs.Button.sourcePath).toBe('src/app/components/button.tsx');
    expect(specs.Banner).toEqual({ variantAxes: ['tone'] });
    expect(Object.keys(specs).slice(0, 2)).toEqual(['Button', 'Banner']);
  });

  it('returns fresh seed objects, so one manifest cannot change the next', () => {
    const first = seedComponentSpecs();
    first.Button.states.push('mutated');
    expect(seedComponentSpecs().Button.states).not.toContain('mutated');
  });
});

describe('buildManifest (lib/token-manifest.mjs)', () => {
  const raw = readTokenSource(join(ROOT, 'hirobius.tokens.json'));
  const all = [...walkTokens(raw)];

  it('takes the previous manifest as an argument and forwards its sections', () => {
    const m = buildManifest(all, raw, { inventory: { a: 1 }, publicClasses: ['x'] });
    expect(m.inventory).toEqual({ a: 1 });
    expect(m.publicClasses).toEqual(['x']);
    expect(m.componentSpecs.Button.sourceExport).toBe('Button');
    expect(m.tokens.primitive.length).toBeGreaterThan(0);
  });

  it('rebuilds the token-derived sections of the committed manifest exactly (golden)', () => {
    // With no previous manifest, every forwarded section is empty, so what is left is
    // what this module derives from the tokens alone. The committed
    // public/hds-manifest.json is the golden copy (pnpm tokens rewrites it).
    const committed = JSON.parse(readFileSync(join(ROOT, 'public', 'hds-manifest.json'), 'utf8'));
    const built = buildManifest(all, raw, {});
    for (const key of ['tokens', 'brand', 'architecture', 'name', 'version', 'format']) {
      expect(built[key], key).toEqual(committed[key]);
    }
  });

  it('is what build-tokens re-exports when given the previous manifest', () => {
    const previous = { componentSpecs: { Button: { props: {} } } };
    const strip = (m) => ({ ...m, generated: null });
    expect(strip(cliBuildManifest(all, raw, previous))).toEqual(
      strip(buildManifest(all, raw, previous)),
    );
  });
});
