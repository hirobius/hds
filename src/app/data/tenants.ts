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
   * CSS custom property overrides this tenant applies — a read-only **mirror**
   * of the generated `src/styles/tenants.css`, for tooling/introspection only
   * (not consumed by the runtime cascade).
   *
   * Single source of truth: `tenants/<slug>/tokens.json` (DTCG overlay) →
   * `scripts/build-tokens.mjs` → `src/styles/tenants.css`. Keep these values
   * byte-identical to that generated CSS; `check:tenant-tokens` validates the
   * overlay shape.
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
 * Design principle: tenant overrides target the **semantic-accent** seam
 * (`--semantic-accent-*` + accent surface/border) by remapping it to a tenant
 * palette ramp. Primitive-tier overrides are disallowed (rule R1). All
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
      // Mirror of src/styles/tenants.css [data-tenant="concrete-creations"]
      // (light mode). Source: tenants/concrete-creations/tokens.json — remaps the
      // semantic-accent seam to the warm `stone` ramp. NOTE: values are
      // placeholders pending final brand hexes (see the overlay $description).
      '--semantic-accent-rest':                'var(--primitive-color-stone-600)',
      '--semantic-accent-hover':               'var(--primitive-color-stone-700)',
      '--semantic-accent-pressed':             'var(--primitive-color-stone-800)',
      '--semantic-accent-subtle':              'var(--primitive-color-stone-100)',
      '--semantic-accent-content':             'var(--primitive-color-stone-700)',
      '--semantic-color-surface-accent':       'var(--primitive-color-stone-600)',
      '--semantic-color-surface-accentSubtle': 'var(--primitive-color-stone-100)',
      '--semantic-color-border-accent':        'var(--primitive-color-stone-600)',
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
