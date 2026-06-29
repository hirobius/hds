/**
 * ReactRouterBridge — wires react-router's hooks into the HDS router-adapter context.
 *
 * @internal — app-only; NOT exported from the public barrel (src/index.ts).
 *
 * This component calls react-router's useNavigate() + useLocation() and react-router's
 * <Link>, builds an HdsRouterAdapter, and mounts <HdsRouterProvider> so every HDS
 * component in the subtree gets real SPA navigation.
 *
 * Mount this at the root of the shared route tree (route-tree.tsx) so both the
 * client browser router (createBrowserRouter) and the SSR memory router
 * (createMemoryRouter in entry-server.tsx) receive the bridge — they both consume
 * the same routeTree export.
 */
import React, { useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { HdsRouterProvider } from './RouterContext';
import type { HdsLinkProps, HdsRouterAdapter } from './RouterContext';

/**
 * A Link component that maps the HDS `to` prop to react-router's `to` prop.
 * Forwarded ref so HDS components that spread anchor props get a real DOM ref.
 */
const ReactRouterLinkComponent = React.forwardRef<HTMLAnchorElement, HdsLinkProps>(
  function ReactRouterLinkComponent({ to, children, ...rest }, _ref) {
    // react-router's <Link> does not support ref forwarding in all versions;
    // we omit the ref rather than risk a runtime warning.
    return (
      <Link to={to} {...rest}>
        {children}
      </Link>
    );
  },
);

ReactRouterLinkComponent.displayName = 'ReactRouterLinkComponent';

interface ReactRouterBridgeProps {
  children: React.ReactNode;
}

/**
 * Provides HDS components with real react-router navigation by reading
 * useNavigate() + useLocation() from the ambient Router context and injecting
 * them via HdsRouterProvider.
 *
 * Must be rendered INSIDE a react-router RouterProvider (it calls the hooks).
 */
export function ReactRouterBridge({ children }: ReactRouterBridgeProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const adapter = useMemo<HdsRouterAdapter>(
    () => ({
      navigate: (href: string) => void navigate(href),
      currentPath: location.pathname,
      LinkComponent: ReactRouterLinkComponent,
    }),
    // Recompute only when navigate reference or pathname changes.
    [navigate, location.pathname],
  );

  return <HdsRouterProvider adapter={adapter}>{children}</HdsRouterProvider>;
}
