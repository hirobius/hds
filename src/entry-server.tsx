/**
 * Server-side render entry for static pre-rendering.
 *
 * Renders each route to an HTML string at build time. The pre-render script
 * (scripts/prerender.mjs) imports and calls render() after running
 * `vite build --ssr src/entry-server.tsx`.
 *
 * Uses the SAME route tree as the client (src/app/routes.tsx) so the
 * server-rendered first paint includes the full docs shell (sidebar + rails)
 * and hydrates cleanly. Lazy doc pages render their Suspense fallback during
 * renderToString — the shell still paints immediately, which is what removes
 * the previous blank-screen-until-JS first paint.
 *
 * prerender.mjs polyfills the browser globals (window/localStorage/...) that
 * a few components read in useState initializers. document is intentionally not
 * polyfilled, so portal-based components (dialogs, command palette) render null
 * on the server — exactly the behavior their `typeof document` guards expect.
 */
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { MotionConfig } from 'motion/react';
import { TenantProvider } from './app/context/TenantContext';
import { LanguageProvider } from './app/context/LanguageContext';
import { ThemeProvider } from './app/context/ThemeContext';
import { FontProvider } from './app/context/FontContext';
import { routeTree } from './app/route-tree';

export function render(url: string): string {
  const router = createMemoryRouter(routeTree, {
    initialEntries: [url],
    initialIndex: 0,
  });

  return renderToString(
    <MotionConfig reducedMotion="user">
      <TenantProvider>
        <LanguageProvider>
          <ThemeProvider>
            <FontProvider>
              <RouterProvider router={router} />
            </FontProvider>
          </ThemeProvider>
        </LanguageProvider>
      </TenantProvider>
    </MotionConfig>,
  );
}
