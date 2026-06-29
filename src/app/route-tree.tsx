import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router';
import NotFoundPage from './pages/NotFoundPage';
import ErrorPage from './pages/ErrorPage';
import InfoPageWrapper from './pages/InfoPageWrapper';
import HDSLayout from './pages/hds/HDSLayout';
import { ReactRouterBridge } from './context/ReactRouterBridge';

// ── HDS doc pages — lazy loaded ───────────────────────────────────────────────
// This is the standalone Hirobius Design System documentation site. Each page
// is its own JS chunk; the HDSLayout shell loads eagerly as the parent route.
//
// This module holds ONLY the route tree (no createBrowserRouter call), so it is
// safe to import from the SSR/prerender entry (src/entry-server.tsx), which has
// no `document`. The client router is created from this tree in ./routes.

const TokensPage = lazy(() => import('./pages/hds/TokensPage'));
const TypographyPage = lazy(() => import('./pages/hds/TypographyPage'));
const ColorPage = lazy(() => import('./pages/hds/ColorPage'));
const ShapePage = lazy(() => import('./pages/hds/ShapePage'));
const ElevationPage = lazy(() => import('./pages/hds/ElevationPage'));
const MotionPage = lazy(() => import('./pages/hds/MotionPage'));
const SpacingPage = lazy(() => import('./pages/hds/SpacingPage'));
const BreakpointsPage = lazy(() => import('./pages/hds/BreakpointsPage'));
const DocUtilitiesPage = lazy(() => import('./pages/hds/components/DocUtilitiesPage'));
const ActionsPage = lazy(() => import('./pages/hds/components/ActionsPage'));
const InputsPage = lazy(() => import('./pages/hds/components/InputsPage'));
const DisplayPage = lazy(() => import('./pages/hds/components/DisplayPage'));
const FeedbackPage = lazy(() => import('./pages/hds/components/FeedbackPage'));
const NavigationPage = lazy(() => import('./pages/hds/components/NavigationPage'));
const LayoutPage = lazy(() => import('./pages/hds/components/LayoutPage'));
const TypographyTestPage = lazy(() => import('./pages/hds/TypographyTestPage'));
const SpacingTestPage = lazy(() => import('./pages/hds/SpacingTestPage'));
const SandboxPage = lazy(() => import('./pages/hds/SandboxPage'));
const ContributionGuidePage = lazy(() => import('./pages/hds/ContributionGuidePage'));
const SystemContractPage = lazy(() => import('./pages/hds/SystemContractPage'));
const MultiBrandThemingPage = lazy(() => import('./pages/hds/MultiBrandThemingPage'));
const GettingStartedPage = lazy(() => import('./pages/hds/GettingStartedPage'));
const GuidancePage = lazy(() => import('./pages/hds/GuidancePage'));
const TechStackPage = lazy(() => import('./pages/hds/TechStackPage'));
const LicensePage = lazy(() => import('./pages/hds/LicensePage'));
const ScopePage = lazy(() => import('./pages/hds/ScopePage'));
const IconsPage = lazy(() => import('./pages/hds/IconsPage'));

// ── Fallback ──────────────────────────────────────────────────────────────────
function HDSFallback() {
  return <div style={{ flex: 1, minHeight: '60vh' }} />;
}

function LazyHDS({ Page }: { Page: ComponentType }) {
  return (
    <Suspense fallback={<HDSFallback />}>
      <Page />
    </Suspense>
  );
}

// Legacy deep-links from the monorepo used /ops/hds/*, /hds/*, and /ops/*
// prefixes. The standalone site serves every page at root, so strip the legacy
// prefix and forward to the equivalent route (preserving search + hash) instead
// of dumping every old link on /color.
function LegacyPrefixRedirect() {
  const { pathname, search, hash } = useLocation();
  let next = pathname;
  for (const prefix of ['/ops/hds', '/hds', '/ops']) {
    if (next === prefix || next.startsWith(`${prefix}/`)) {
      next = next.slice(prefix.length) || '/';
      break;
    }
  }
  if (!next.startsWith('/')) next = `/${next}`;
  return <Navigate to={{ pathname: next, search, hash }} replace />;
}

// ── Router bridge wrapper ─────────────────────────────────────────────────────
// Wraps HDSLayout with ReactRouterBridge so HDS components get real SPA
// navigation via useHdsRouter() rather than direct react-router imports.
// Placed here (inside the route tree module) so BOTH the client browser router
// (createBrowserRouter in ./routes.tsx) and the SSR memory router
// (createMemoryRouter in src/entry-server.tsx) — both of which consume this
// shared routeTree export — automatically pick up the bridge.
function RootWithBridge() {
  return (
    <ReactRouterBridge>
      <HDSLayout />
    </ReactRouterBridge>
  );
}

// ── Route tree ────────────────────────────────────────────────────────────────

// Shared route tree — consumed by createBrowserRouter (client, ./routes.tsx) and
// by the SSR/prerender entry (src/entry-server.tsx) via createMemoryRouter, so
// the server-rendered first paint matches the client and hydrates cleanly.
export const routeTree = [
  {
    path: '/',
    Component: RootWithBridge,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/color" replace /> },
      { path: 'info', Component: InfoPageWrapper },

      // ── Getting started / system ──────────────────────────────────────────
      { path: 'getting-started', element: <LazyHDS Page={GettingStartedPage} /> },
      { path: 'guidance', element: <LazyHDS Page={GuidancePage} /> },
      { path: 'scope', element: <LazyHDS Page={ScopePage} /> },
      { path: 'tech-stack', element: <LazyHDS Page={TechStackPage} /> },
      { path: 'license', element: <LazyHDS Page={LicensePage} /> },
      { path: 'contribution-guide', element: <LazyHDS Page={ContributionGuidePage} /> },
      { path: 'system-contract', element: <LazyHDS Page={SystemContractPage} /> },
      { path: 'brand-theming', element: <LazyHDS Page={MultiBrandThemingPage} /> },
      { path: 'sandbox', element: <LazyHDS Page={SandboxPage} /> },

      // ── Foundations ───────────────────────────────────────────────────────
      { path: 'color', element: <LazyHDS Page={ColorPage} /> },
      { path: 'typography', element: <LazyHDS Page={TypographyPage} /> },
      { path: 'spacing', element: <LazyHDS Page={SpacingPage} /> },
      { path: 'shape', element: <LazyHDS Page={ShapePage} /> },
      { path: 'borders', element: <Navigate to="/shape" replace /> },
      { path: 'elevation', element: <LazyHDS Page={ElevationPage} /> },
      { path: 'motion', element: <LazyHDS Page={MotionPage} /> },
      { path: 'breakpoints', element: <LazyHDS Page={BreakpointsPage} /> },
      { path: 'tokens', element: <LazyHDS Page={TokensPage} /> },
      { path: 'icons', element: <LazyHDS Page={IconsPage} /> },

      // ── Components ────────────────────────────────────────────────────────
      { path: 'components', element: <Navigate to="/components/actions" replace /> },
      { path: 'components/actions', element: <LazyHDS Page={ActionsPage} /> },
      { path: 'components/inputs', element: <LazyHDS Page={InputsPage} /> },
      { path: 'components/display', element: <LazyHDS Page={DisplayPage} /> },
      { path: 'components/feedback', element: <LazyHDS Page={FeedbackPage} /> },
      { path: 'components/navigation', element: <LazyHDS Page={NavigationPage} /> },
      { path: 'components/layout', element: <LazyHDS Page={LayoutPage} /> },
      { path: 'components/doc-utilities', element: <LazyHDS Page={DocUtilitiesPage} /> },
      {
        path: 'components/system-primitives',
        element: <Navigate to="/components/doc-utilities" replace />,
      },
      { path: 'components/media', element: <Navigate to="/components/display" replace /> },

      // ── Tests / WIP ───────────────────────────────────────────────────────
      { path: 'typography-test', element: <LazyHDS Page={TypographyTestPage} /> },
      { path: 'spacing-test', element: <LazyHDS Page={SpacingTestPage} /> },

      // ── Legacy /hds/*, /ops/hds/*, /ops/* deep links → root equivalents ────
      { path: 'hds/*', element: <LegacyPrefixRedirect /> },
      { path: 'ops/*', element: <LegacyPrefixRedirect /> },

      { path: '*', Component: NotFoundPage },
    ],
  },
];
