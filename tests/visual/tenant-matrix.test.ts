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

  it('only names brands the docs site CSS can activate', () => {
    // The docs site loads the shipped tenants.css and, after it, the demo
    // directions the package does not ship (hds#1205).
    const css = ['src/styles/tenants.css', 'src/styles/tenants-docs-only.css']
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(readFileSync('docs-site/app/globals.css', 'utf8')).toContain('tenants-docs-only.css');
    for (const brand of BRANDS) {
      expect(existsSync(`directions/${brand}/tokens.json`)).toBe(true);
      expect(css).toContain(`[data-brand='${brand}']`);
    }
  });
});
