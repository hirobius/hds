import type { TenantSlug } from '../context/TenantContext';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A tenant entry in the registry.
 *
 * `tokens` is a Record of CSS custom property names to values.
 * These are documented here for reference; the actual cascade is driven
 * by `src/styles/tenants.css` — not JavaScript.
 *
 * The `tokens` field is useful for:
 *   - Tooling that needs to introspect overrides (e.g. Figma bridge)
 *   - Generating theme previews programmatically
 *   - Injecting tokens via `<style>` for SSR / email rendering
 */
export interface TenantDefinition {
  /** Machine-readable slug — must match the CSS `[data-tenant="..."]` selector. */
  slug: TenantSlug;
  /** Human-readable display name. */
  name: string;
  /** Short description of the tenant / client brand. */
  description: string;
  /**
   * CSS custom property overrides this tenant applies.
   * Keys are exact `--var-name` strings; values are the resolved CSS value.
   * Kept in sync with `src/styles/tenants.css` manually.
   */
  tokens: Record<string, string>;
}

// ── Registry ──────────────────────────────────────────────────────────────────

/**
 * TENANT_REGISTRY
 *
 * Single source of truth for all registered tenant brands.
 * Add a new entry here and a matching block in `src/styles/tenants.css`
 * for each new client.
 *
 * Design principle: tenant overrides target only the primitive accent ramp
 * and (optionally) the typography family primitives. All semantic and
 * component tokens inherit automatically via the var() reference chain.
 */
export const TENANT_REGISTRY: TenantDefinition[] = [
  {
    slug: 'hirobius',
    name: 'Hirobius',
    description: 'Default Hirobius Design System brand — electric blue accent, Satoshi / Clash Display.',
    tokens: {
      // Hirobius uses the base tokens; no overrides needed.
      // Listed here so tooling can enumerate all tenants uniformly.
      '--primitive-typography-family-primary': '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      '--primitive-typography-family-display': '"Clash Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  },
  {
    slug: 'concrete-creations',
    name: 'Concrete Creations',
    description: 'WA State LLC e-commerce pilot — handmade concrete products. Warm stone/brown accent, Satoshi body / Clash Display headings.',
    tokens: {
      // Accent ramp: warm stone-brown replacing the default blue.
      // Light-mode accent (mid-tone warm brown)
      '--primitive-color-blue-50':  'oklch(0.97 0.02 60)',
      '--primitive-color-blue-100': 'oklch(0.94 0.04 60)',
      '--primitive-color-blue-200': 'oklch(0.88 0.07 60)',
      '--primitive-color-blue-300': 'oklch(0.77 0.12 55)',
      '--primitive-color-blue-400': 'oklch(0.66 0.13 50)',
      '--primitive-color-blue-450': 'oklch(0.56 0.13 48)',
      '--primitive-color-blue-500': 'oklch(0.50 0.13 46)',   // primary accent — warm brown
      '--primitive-color-blue-600': 'oklch(0.42 0.12 44)',
      '--primitive-color-blue-700': 'oklch(0.36 0.10 42)',
      '--primitive-color-blue-800': 'oklch(0.28 0.07 40)',
      '--primitive-color-blue-900': 'oklch(0.20 0.05 38)',
      // Typography: Satoshi body + Clash Display headings (matches Hirobius default)
      '--primitive-typography-family-primary': '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      '--primitive-typography-family-display': '"Clash Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Look up a tenant definition by slug. Returns undefined if not found. */
export function getTenant(slug: TenantSlug): TenantDefinition | undefined {
  return TENANT_REGISTRY.find(t => t.slug === slug);
}

/** All valid tenant slugs in registration order. */
export const TENANT_SLUGS: TenantSlug[] = TENANT_REGISTRY.map(t => t.slug);
