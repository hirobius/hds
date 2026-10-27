import { describe, it, expect } from 'vitest';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readTokenSource } from '../lib/token-source.mjs';
import { walkTokens } from '../lib/token-tree.mjs';
import {
  COMPONENT_SPEC_SEEDS,
  buildComponentSpecs,
  buildManifest,
} from '../lib/token-manifest.mjs';

describe('buildComponentSpecs', () => {
  it('keeps unseeded specs and the previous keys of seeded ones, seed keys winning', () => {
    const specs = buildComponentSpecs({
      Zeta: { props: ['a'] },
      Button: { props: ['label'], tokens: { stale: 'x' } },
    });
    expect(Object.keys(specs).slice(0, 2)).toEqual(['Zeta', 'Button']);
    expect(specs.Zeta).toEqual({ props: ['a'] });
    expect(specs.Button.props).toEqual(['label']);
    expect(specs.Button.tokens).toEqual(COMPONENT_SPEC_SEEDS.Button.tokens);
  });

  it('seeds every spec when there is no previous manifest', () => {
    expect(Object.keys(buildComponentSpecs(undefined))).toEqual(Object.keys(COMPONENT_SPEC_SEEDS));
  });
});

describe('buildManifest', () => {
  it('needs no manifest on disk: the previous one is a parameter', () => {
    const raw = readTokenSource(
      join(dirname(fileURLToPath(import.meta.url)), '../../hirobius.tokens.json'),
    );
    const m = buildManifest([...walkTokens(raw)], raw, { phases: ['p'] });
    expect(m.phases).toEqual(['p']);
    expect(Object.keys(m.componentSpecs)).toEqual(Object.keys(COMPONENT_SPEC_SEEDS));
    expect(m.tokens.primitive.length).toBeGreaterThan(0);
  });
});
