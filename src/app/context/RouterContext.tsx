/**
 * @internal RouterContext — router-adapter seam for @hirobius/design-system.
 *
 * Allows consuming apps to inject react-router, Next.js <Link>, or any other
 * router into HDS components without coupling the library to a specific router.
 *
 * Usage (react-router apps):
 *   Mount <ReactRouterBridge> (app-internal) at the root of the route tree.
 *
 * Usage (no-router / custom router):
 *   Render <HdsRouterProvider adapter={...}> with your own HdsRouterAdapter.
 *
 * When no provider is present, components fall back to plain <a href> + window.location.
 * This module MUST NOT import from 'react-router'.
 */
import React, { createContext, forwardRef, useContext } from 'react';

// ── Public types ──────────────────────────────────────────────────────────────

/** Props accepted by any HDS link component (internal or injected). */
export interface HdsLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Destination path or URL (maps to href on the underlying anchor). */
  to: string;
  children?: React.ReactNode;
}

/** A React component type that renders an anchor-compatible link. */
export type HdsLinkComponent = React.ComponentType<HdsLinkProps>;

/** The shape of a router adapter injected via HdsRouterProvider. */
export interface HdsRouterAdapter {
  /** Navigate imperatively to the given href. */
  navigate: (href: string) => void;
  /** The current pathname (e.g. "/color"). */
  currentPath: string;
  /** Component used to render internal links. */
  LinkComponent: HdsLinkComponent;
}

// ── Default anchor LinkComponent ──────────────────────────────────────────────

/**
 * Default link component used when no router is injected.
 * Renders a plain <a> element; `to` maps to `href`.
 * @internal
 */
export const DefaultLinkComponent: HdsLinkComponent = forwardRef<
  HTMLAnchorElement,
  HdsLinkProps
>(function DefaultLinkComponent({ to, children, ...rest }, ref) {
  return (
    <a ref={ref} href={to} {...rest}>
      {children}
    </a>
  );
});

// ── Context ───────────────────────────────────────────────────────────────────

/**
 * React context that holds the current HdsRouterAdapter.
 * `undefined` when no HdsRouterProvider is mounted above.
 * @internal
 */
const HdsRouterContext = createContext<HdsRouterAdapter | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Inject a router adapter so HDS components can navigate without importing
 * react-router directly.
 *
 * @example
 * ```tsx
 * const adapter: HdsRouterAdapter = {
 *   navigate: (href) => router.push(href),
 *   currentPath: pathname,
 *   LinkComponent: ({ to, children, ...rest }) => <Link href={to} {...rest}>{children}</Link>,
 * };
 * <HdsRouterProvider adapter={adapter}>{children}</HdsRouterProvider>
 * ```
 */
export function HdsRouterProvider({
  adapter,
  children,
}: {
  adapter: HdsRouterAdapter;
  children: React.ReactNode;
}) {
  return (
    <HdsRouterContext.Provider value={adapter}>{children}</HdsRouterContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the currently injected HdsRouterAdapter, or a router-free fallback
 * adapter when no HdsRouterProvider is mounted above the calling component.
 *
 * The fallback is computed fresh on each call so `currentPath` is never stale.
 */
export function useHdsRouter(): HdsRouterAdapter {
  const ctx = useContext(HdsRouterContext);
  if (ctx !== undefined) return ctx;

  // Fallback — no provider present; use window.location directly.
  return {
    navigate(href: string) {
      if (typeof window !== 'undefined') {
        window.location.assign(href);
      }
    },
    currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
    LinkComponent: DefaultLinkComponent,
  };
}
