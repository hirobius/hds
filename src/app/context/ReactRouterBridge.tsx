/**
 * ReactRouterBridge — app-internal adapter that wires the docs site's
 * react-router into the HDS RouterContext seam.
 *
 * This is the ONE place in the repo (outside route-tree/routes/entry-server)
 * allowed to import react-router for component navigation. It is mounted at the
 * root of `route-tree.tsx` so it wraps every route in BOTH the client
 * (createBrowserRouter) and SSR (createMemoryRouter) trees.
 *
 * NOT exported from the public barrel — consumers bring their own adapter.
 */
import { forwardRef, useMemo, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  HdsRouterProvider,
  type HdsLinkComponent,
  type HdsLinkProps,
  type HdsRouterAdapter,
} from './RouterContext';

const BridgeLink: HdsLinkComponent = forwardRef<HTMLAnchorElement, HdsLinkProps>(
  function BridgeLink({ to, children, ...rest }, ref) {
    return (
      <Link ref={ref} to={to} {...rest}>
        {children}
      </Link>
    );
  },
);

export function ReactRouterBridge({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const adapter = useMemo<HdsRouterAdapter>(
    () => ({
      navigate: (href, options) => navigate(href, options),
      currentPath: location.pathname,
      LinkComponent: BridgeLink,
    }),
    [navigate, location.pathname],
  );

  return <HdsRouterProvider adapter={adapter}>{children}</HdsRouterProvider>;
}
