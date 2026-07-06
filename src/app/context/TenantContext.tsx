import { createContext, useContext, useEffect, type ReactNode } from 'react';

export type TenantSlug = 'hirobius' | 'concrete-creations' | 'lilac-bonds' | (string & {});

interface TenantCtx {
  /** Active tenant slug, or null in single-tenant mode. */
  tenantSlug: TenantSlug | null;
}

const TenantContext = createContext<TenantCtx>({ tenantSlug: null });

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
    document.documentElement.setAttribute('data-tenant', slug);
    return () => {
      document.documentElement.removeAttribute('data-tenant');
    };
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
    const prev = document.documentElement.getAttribute('data-tenant');
    document.documentElement.setAttribute('data-tenant', slug);
    return () => {
      if (prev !== null) {
        document.documentElement.setAttribute('data-tenant', prev);
      } else {
        document.documentElement.removeAttribute('data-tenant');
      }
    };
  }, [slug]);
}
