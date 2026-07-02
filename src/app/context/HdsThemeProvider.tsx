/**
 * HdsThemeProvider — the declarative HDS theming contract (ADR-020 §3).
 *
 * HDS components never read a theme object. The public override surface is a
 * set of plain `data-*` attributes + CSS variables on a root element, so it
 * works with ZERO JavaScript — a static Astro page sets the attributes in its
 * layout and imports `styles.css`, nothing else. This provider is the typed
 * React convenience that renders those same attributes (and can mirror them to
 * `<html>`); it is never required for the styles to work.
 *
 * Four dials:
 *   brand    → data-brand + data-tenant   remaps --semantic-accent-* (multi-brand overlays)
 *   theme    → data-theme="light" | "dark"
 *   density  → data-density="comfortable" | "compact"   drives --hds-space-*
 *   fonts    → --hds-font-family / --hds-font-family-mono
 *
 * Zero-JS / Astro equivalent of `<HdsThemeProvider brand="acme" theme="dark">`:
 *   <html data-hds data-brand="acme" data-tenant="acme" data-theme="dark">
 *
 * Runtime brand switching (ADR-020 §4 / #62): drive `brand` from parent state —
 * changing it re-renders the attributes, swapping the overlay live. `brand`
 * also emits `data-tenant` so the current `[data-tenant]` overlay CSS activates
 * today; #62 migrates the compiled CSS to `[data-brand]`.
 *
 * Relationship to `ThemeProvider` (./ThemeContext): that one is the *stateful*
 * app-shell provider — it persists a user's theme/density choice to
 * localStorage and follows the OS. This provider is the *declarative*,
 * config-driven single entry meant for embedding, Astro, and multi-brand. Use
 * whichever fits; don't drive `theme`/`density` from both at the document level.
 *
 * @doc-ignore — provider/hook seam (like RouterContext), not a visual component;
 *   it carries no Figma specimen or docs page, so manifest discovery must skip
 *   it despite the Hds* name prefix.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Slot } from '@radix-ui/react-slot';

/** Light or dark surface treatment. */
export type HdsThemeMode = 'light' | 'dark';

/** Spacing density. `comfortable` is the default; `compact` tightens `--hds-space-*`. */
export type HdsDensity = 'comfortable' | 'compact';

/** Downstream font-family overrides (any CSS `font-family` value). */
export interface HdsFontOverrides {
  /** Overrides `--hds-font-family` (body / UI / display). */
  sans?: string;
  /** Overrides `--hds-font-family-mono` (code / token names). */
  mono?: string;
}

/** The resolved theme dials, readable via `useHdsTheme()`. */
export interface HdsThemeValue {
  /** Active brand overlay slug (`data-brand` / `data-tenant`). */
  brand?: string;
  /** Active theme (`data-theme`). */
  theme?: HdsThemeMode;
  /** Active density (`data-density`). */
  density?: HdsDensity;
  /** Font-family overrides applied as CSS variables. */
  fonts?: HdsFontOverrides;
}

export interface HdsThemeProviderProps extends HdsThemeValue {
  children?: ReactNode;
  /**
   * Render the theme attributes onto the single child element (Radix `Slot`)
   * instead of an extra wrapper `<div>`. Ignored when `applyToDocument` is set.
   */
  asChild?: boolean;
  /** Class applied to the wrapper element (ignored with `asChild` / `applyToDocument`). */
  className?: string;
  /**
   * Mirror the dials onto `<html>` for whole-document theming (SSR-guarded).
   * When set, no wrapper element is rendered. Default `false` (scoped wrapper).
   */
  applyToDocument?: boolean;
}

const HdsThemeContext = createContext<HdsThemeValue>({});

function setAttr(el: HTMLElement, name: string, value: string | undefined) {
  if (value == null || value === '') el.removeAttribute(name);
  else el.setAttribute(name, value);
}

/**
 * Provide the HDS theme dials to everything below. In the default (scoped) mode
 * it renders a `[data-hds]` wrapper carrying `data-brand` / `data-tenant` /
 * `data-theme` / `data-density` and the font CSS variables — SSR-safe, no
 * effect required.
 */
export function HdsThemeProvider({
  brand,
  theme,
  density,
  fonts,
  asChild = false,
  className,
  applyToDocument = false,
  children,
}: HdsThemeProviderProps) {
  // Destructure to primitives so hook deps are exact (a new `fonts` object with
  // the same values doesn't re-run effects or bust the memo).
  const fontSans = fonts?.sans;
  const fontMono = fonts?.mono;

  const value = useMemo<HdsThemeValue>(
    () => ({
      brand,
      theme,
      density,
      fonts: fontSans || fontMono ? { sans: fontSans, mono: fontMono } : undefined,
    }),
    [brand, theme, density, fontSans, fontMono],
  );

  // Whole-document mode: reflect the dials onto <html>, restoring on cleanup.
  useEffect(() => {
    if (!applyToDocument || typeof document === 'undefined') return;
    const el = document.documentElement;
    const prev = {
      brand: el.getAttribute('data-brand'),
      tenant: el.getAttribute('data-tenant'),
      theme: el.getAttribute('data-theme'),
      density: el.getAttribute('data-density'),
      sans: el.style.getPropertyValue('--hds-font-family'),
      mono: el.style.getPropertyValue('--hds-font-family-mono'),
    };
    setAttr(el, 'data-brand', brand);
    setAttr(el, 'data-tenant', brand);
    setAttr(el, 'data-theme', theme);
    setAttr(el, 'data-density', density);
    if (fontSans) el.style.setProperty('--hds-font-family', fontSans);
    if (fontMono) el.style.setProperty('--hds-font-family-mono', fontMono);
    return () => {
      setAttr(el, 'data-brand', prev.brand ?? undefined);
      setAttr(el, 'data-tenant', prev.tenant ?? undefined);
      setAttr(el, 'data-theme', prev.theme ?? undefined);
      setAttr(el, 'data-density', prev.density ?? undefined);
      if (prev.sans) el.style.setProperty('--hds-font-family', prev.sans);
      else el.style.removeProperty('--hds-font-family');
      if (prev.mono) el.style.setProperty('--hds-font-family-mono', prev.mono);
      else el.style.removeProperty('--hds-font-family-mono');
    };
  }, [applyToDocument, brand, theme, density, fontSans, fontMono]);

  if (applyToDocument) {
    return <HdsThemeContext.Provider value={value}>{children}</HdsThemeContext.Provider>;
  }

  const style: CSSProperties = {};
  if (fontSans) (style as Record<string, string>)['--hds-font-family'] = fontSans;
  if (fontMono) (style as Record<string, string>)['--hds-font-family-mono'] = fontMono;

  const Comp = asChild ? Slot : 'div';
  return (
    <HdsThemeContext.Provider value={value}>
      <Comp
        data-hds=""
        data-brand={brand}
        data-tenant={brand}
        data-theme={theme}
        data-density={density}
        className={className}
        style={style}
      >
        {children}
      </Comp>
    </HdsThemeContext.Provider>
  );
}

/** Read the active theme dials. Returns `{}` when no provider is present. */
export function useHdsTheme(): HdsThemeValue {
  return useContext(HdsThemeContext);
}
