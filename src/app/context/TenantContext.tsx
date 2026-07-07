import { createContext, useContext, useEffect, type ReactNode } from 'react';

export type TenantSlug = 'hirobius' | 'concrete-creations' | 'lilac-bonds' | (string & {});

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
 * Reads VITE_TENANT_SLUG from the Vite environment and, if set, writes
 * `data-tenant="<slug>"` onto `<html>` so CSS tenant-scope selectors
 * (e.g. `[data-tenant="acme"] .hds-button`) resolve correctly at runtime.
 *
 * Single-tenant deployments that never set VITE_TENANT_SLUG are unaffected:
 * no attribute is written and no context value is populated.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const slug: TenantSlug | null =
    typeof import.meta.env['VITE_TENANT_SLUG'] === 'string' &&
    import.meta.env['VITE_TENANT_SLUG'].trim().length > 0
      ? (import.meta.env['VITE_TENANT_SLUG'].trim() as TenantSlug)
      : null;

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
