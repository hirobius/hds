/**
 * HdsThemeProvider — framework-agnostic theming contract for HDS.
 * @category Theming
 * @tier primitive
 * @doc-exempt: API/contract primitive, documented in README (no doc page yet)
 *
 * HDS theming is driven entirely by root attributes + CSS custom properties, so
 * it works with ZERO JavaScript (the Astro / static path just sets the same
 * attributes on a layout element). The four override "dials":
 *
 *   dial     attribute / var           values                         default
 *   ───────  ────────────────────────  ─────────────────────────────  ──────────
 *   theme    data-theme                "dark" (light = unset)          light
 *   density  data-density              "compact" (comfortable = unset) comfortable
 *   brand    data-brand + data-tenant  overlay slug (e.g. "acme")      base
 *   font     --hds-font-family(-mono)  any CSS font-family value       Satoshi / Geist Mono
 *
 * This provider is a thin, typed convenience that renders a `data-hds` scope
 * wrapper carrying those attributes — it does NOT own state, storage, or a
 * toggle (that is the in-app ThemeContext's job). Styles do not require it; it
 * exists so React apps can set the contract declaratively and read it back via
 * `useHdsTheme()`.
 *
 *   <HdsThemeProvider theme="dark" density="compact" brand="acme">
 *     <App />
 *   </HdsThemeProvider>
 *
 * Equivalent zero-JS markup:
 *   <div data-hds data-theme="dark" data-density="compact" data-brand="acme">…</div>
 */

import * as React from 'react';

/** @public */
export type HdsTheme = 'light' | 'dark';
/** @public */
export type HdsDensity = 'comfortable' | 'compact';

/** @public */
export interface HdsThemeValue {
  /** Colour theme. `"dark"` activates the dark token overrides; omit for light. */
  theme?: HdsTheme;
  /** Spacing density. `"compact"` activates the compact overrides; omit for comfortable. */
  density?: HdsDensity;
  /** Brand-overlay slug (compiled `[data-brand]`/`[data-tenant]` block). Omit for the base brand. */
  brand?: string;
  /** Body font-family override (`--hds-font-family`). */
  fontFamily?: string;
  /** Monospace font-family override (`--hds-font-family-mono`). */
  fontFamilyMono?: string;
}

const HdsThemeContext = React.createContext<HdsThemeValue>({});

/**
 * Read the nearest HdsThemeProvider's active dial values. Returns an empty
 * object when no provider is present (styles still work off the defaults).
 * @public
 */
export function useHdsTheme(): HdsThemeValue {
  return React.useContext(HdsThemeContext);
}

/** @public */
export interface HdsThemeProviderProps extends HdsThemeValue {
  children: React.ReactNode;
  /** Wrapper element type for the `data-hds` scope. Default `"div"`. */
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a `data-hds` scope wrapper that carries the four theming dials as
 * root attributes + CSS vars, and exposes them to `useHdsTheme()`.
 * @public
 */
export function HdsThemeProvider({
  theme,
  density,
  brand,
  fontFamily,
  fontFamilyMono,
  as: Comp = 'div',
  className,
  style,
  children,
}: HdsThemeProviderProps) {
  const value = React.useMemo<HdsThemeValue>(
    () => ({ theme, density, brand, fontFamily, fontFamilyMono }),
    [theme, density, brand, fontFamily, fontFamilyMono],
  );

  const fontVars: React.CSSProperties = {};
  if (fontFamily) (fontVars as Record<string, string>)['--hds-font-family'] = fontFamily;
  if (fontFamilyMono)
    (fontVars as Record<string, string>)['--hds-font-family-mono'] = fontFamilyMono;

  return (
    <HdsThemeContext.Provider value={value}>
      <Comp
        data-hds=""
        // `data-theme`/`data-density` only take effect for the non-default value
        // ("dark"/"compact"); the comfortable/light defaults leave them unset.
        data-theme={theme === 'dark' ? 'dark' : undefined}
        data-density={density === 'compact' ? 'compact' : undefined}
        // Brand keys off `data-brand` (the ADR-023 public attribute) with
        // `data-tenant` mirrored for back-compat with today's compiled overlays.
        data-brand={brand}
        data-tenant={brand}
        className={className}
        style={{ ...fontVars, ...style }}
      >
        {children}
      </Comp>
    </HdsThemeContext.Provider>
  );
}
