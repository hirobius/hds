import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { BRANDS, DENSITIES, THEMES, PRIMITIVES, matrixCases } from './tenant-matrix';

/** hds#126: the brand × density × theme matrix behind tenant-matrix.spec.ts. */
describe('tenant visual matrix', () => {
  const cases = matrixCases();

  it('covers every primitive under every brand, density and theme', () => {
    expect(cases).toHaveLength(
      PRIMITIVES.length * BRANDS.length * DENSITIES.length * THEMES.length,
    );
    for (const p of PRIMITIVES)
      for (const brand of BRANDS)
        for (const density of DENSITIES)
          for (const theme of THEMES)
            expect(cases).toContainEqual({
              route: `/docs/components/${p}`,
              name: `${p}--${brand}--${density}--${theme}`,
              brand,
              density,
              theme,
            });
  });

  it('names each snapshot uniquely, brand first after the primitive', () => {
    const names = cases.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    // A broken tenant accent then fails only files carrying that brand's slug.
    for (const c of cases) expect(c.name.split('--')[1]).toBe(c.brand);
  });

  it('only names brands the shipped CSS can activate', () => {
    const css = readFileSync('src/styles/tenants.css', 'utf8');
    for (const brand of BRANDS) {
      expect(existsSync(`tenants/${brand}/tokens.json`)).toBe(true);
      expect(css).toContain(`[data-brand='${brand}']`);
    }
  });
});
