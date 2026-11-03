/**
 * hds#126: the per-tenant visual contract. A representative primitive set is
 * snapshotted under every brand × density × theme, so a layout or token change
 * made for one tenant cannot silently break another.
 *
 * The attributes are set on <html>, the same root the app sets them on
 * (TenantProvider writes data-brand; the docs density switch writes
 * data-density; the theme toggle writes data-theme).
 *
 * To add an axis value: append it below, then run
 * `pnpm test:visual-baselines:update` and commit the new PNGs. A brand must
 * have a directions/<slug>/tokens.json overlay built into src/styles/tenants.css
 * (tenant-matrix.test.ts checks this). Each new value multiplies the snapshot
 * count, so widen PRIMITIVES only for a primitive that tenants restyle.
 */
export const BRANDS = ['soft-demo', 'accent-lilac'] as const;
export const DENSITIES = ['comfortable', 'compact'] as const;
export const THEMES = ['light', 'dark'] as const;
export const PRIMITIVES = ['button', 'card', 'input', 'badge', 'alert', 'table'] as const;

export type Brand = (typeof BRANDS)[number];
export type Density = (typeof DENSITIES)[number];
type Theme = (typeof THEMES)[number];

interface MatrixCase {
  route: string;
  /** Snapshot file stem: `<primitive>--<brand>--<density>--<theme>`. */
  name: string;
  brand: Brand;
  density: Density;
  theme: Theme;
}

export function matrixCases(): MatrixCase[] {
  return PRIMITIVES.flatMap((p) =>
    BRANDS.flatMap((brand) =>
      DENSITIES.flatMap((density) =>
        THEMES.map((theme) => ({
          route: `/docs/components/${p}`,
          name: `${p}--${brand}--${density}--${theme}`,
          brand,
          density,
          theme,
        })),
      ),
    ),
  );
}
