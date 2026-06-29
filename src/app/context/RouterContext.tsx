/**
 * RouterContext — router-adapter seam for @hirobius/design-system.
 *
 * HDS components never import a router. Navigation is sourced from an injected
 * adapter so the library works in three modes:
 *
 *   1. Zero-router (default)  — no provider; links are plain <a> and navigate
 *      falls back to window.location. Drop-in for apps with no router
 *      (e.g. job-hunt, a plain Vite/React app).
 *   2. react-router consumers — wrap the app once in <HdsRouterProvider> with an
 *      adapter that bridges useNavigate()/useLocation()/<Link>. The docs site
 *      does this internally via ReactRouterBridge (NOT exported).
 *   3. Next.js / other routers — same seam: provide an adapter mapping to that
 *      router's navigation + Link.
 *
 * IMPORTANT: this module MUST NOT import react-router (or any router). It is the
 * router-free contract every consumer can satisfy.
 *
 * @doc-ignore — provider/hook seam (like ThemeProvider et al.), not a visual
 *   component; it carries no Figma specimen or docs page, so manifest discovery
 *   must skip it despite the Hds* name prefix.
 */
import {
  createContext,
  forwardRef,
  useContext,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

/** Options forwarded to a router's navigate call (state preserved for SPA nav). */
export interface HdsNavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
  /** Opaque router state (e.g. scroll restoration hints). Ignored by the anchor default. */
  state?: unknown;
}

/** Props for the injectable link component. Mirrors react-router's `<Link to>`. */
export interface HdsLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Destination route or URL. */
  to: string;
  children?: ReactNode;
}

/** A link component the host app supplies (or the anchor default below). */
export type HdsLinkComponent = React.ComponentType<
  HdsLinkProps & React.RefAttributes<HTMLAnchorElement>
>;

/** The navigation surface HDS components consume. */
export interface HdsRouterAdapter {
  /** Navigate to an href. The anchor default uses window.location.assign. */
  navigate: (href: string, options?: HdsNavigateOptions) => void;
  /** Current path (e.g. "/color"). Used for active-route detection. */
  currentPath: string;
  /** Link component for client-side nav. Defaults to a plain anchor. */
  LinkComponent: HdsLinkComponent;
}

/** Default link: a forwardRef anchor. No router required. */
const DefaultLinkComponent: HdsLinkComponent = forwardRef<HTMLAnchorElement, HdsLinkProps>(
  function HdsAnchorLink({ to, children, ...rest }, ref) {
    return (
      <a ref={ref} href={to} {...rest}>
        {children}
      </a>
    );
  },
);

const HdsRouterContext = createContext<HdsRouterAdapter | null>(null);

export interface HdsRouterProviderProps {
  adapter: HdsRouterAdapter;
  children?: ReactNode;
}

/**
 * Provide a router adapter to all HDS components below. Wrap your app root once.
 */
export function HdsRouterProvider({ adapter, children }: HdsRouterProviderProps) {
  return <HdsRouterContext.Provider value={adapter}>{children}</HdsRouterContext.Provider>;
}

/**
 * Read the active router adapter. With no provider, returns a router-free
 * fallback: navigate → window.location.assign (SSR-guarded), currentPath read
 * fresh from window.location, LinkComponent → the anchor default.
 */
export function useHdsRouter(): HdsRouterAdapter {
  const ctx = useContext(HdsRouterContext);
  if (ctx) return ctx;
  return {
    navigate: (href) => {
      if (typeof window !== 'undefined') {
        window.location.assign(href);
      }
    },
    currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
    LinkComponent: DefaultLinkComponent,
  };
}
