import { createContext, useContext, useEffect, type ReactNode } from 'react';

export type TenantSlug = 'hirobius' | 'concrete-creations' | 'accent-lilac' | (string & {});

interface TenantCtx {
  /** Active tenant slug, or null in single-tenant mode. */
  tenantSlug: TenantSlug | null;
}

const TenantContext = createContext<TenantCtx>({ tenantSlug: null });

/**
 * #62: the brand-scope attributes written to `<html>`. `data-brand` is the
 * primary attribute; `data-tenant` is retained as a supported alias so existing
 * consumers keep working. The compiled overlay CSS targets both selectors.
 */
const BRAND_ATTRS = ['data-brand', 'data-tenant'] as const;
function applyBrandAttrs(slug: string): void {
  for (const attr of BRAND_ATTRS) document.documentElement.setAttribute(attr, slug);
}
function clearBrandAttrs(): void {
  for (const attr of BRAND_ATTRS) document.documentElement.removeAttribute(attr);
}

/**
 * TenantProvider
 *
 * Writes `data-tenant="<slug>"` onto `<html>` so CSS tenant-scope selectors
 * (e.g. `[data-tenant="acme"] .hds-button`) resolve correctly at runtime.
 *
 * Pass the slug in. It used to be read from `VITE_TENANT_SLUG` via
 * `import.meta.env`, which the library build evaluated at HDS's build time
 * rather than the consumer's — it baked to `{}` in `dist/contexts.js`, so the
 * provider had been an inert no-op for every installed consumer regardless of
 * what they set. Taking a prop is therefore not a behaviour change for anyone
 * downstream: it is the first version that works at all.
 *
 * An app that still wants an env var reads it itself and passes the result,
 * which is the only place that knows its own build:
 *
 * ```tsx
 * <TenantProvider slug={import.meta.env.VITE_TENANT_SLUG as TenantSlug}>
 * ```
 *
 * Omitting `slug` writes no attribute and populates no context value.
 */
export function TenantProvider({
  children,
  slug = null,
}: {
  children: ReactNode;
  /** The active tenant, or null for a single-tenant deployment. */
  slug?: TenantSlug | null;
}) {
  useEffect(() => {
    if (!slug) return;
    applyBrandAttrs(slug);
    return () => clearBrandAttrs();
  }, [slug]);

  return <TenantContext.Provider value={{ tenantSlug: slug }}>{children}</TenantContext.Provider>;
}

/** Returns the active tenant slug (null in single-tenant mode). */
export function useTenant(): TenantCtx {
  return useContext(TenantContext);
}

/**
 * useTenantOnDocument
 *
 * Imperatively applies `data-tenant` to `<html>` — useful when the
 * provider wraps only part of the tree but you need document-wide scope.
 */
export function useTenantOnDocument(slug: TenantSlug): void {
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-brand');
    applyBrandAttrs(slug);
    return () => {
      if (prev !== null) {
        applyBrandAttrs(prev);
      } else {
        clearBrandAttrs();
      }
    };
  }, [slug]);
}
