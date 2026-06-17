/**
 * Server-side render entry for static pre-rendering.
 *
 * Renders each public portfolio route to an HTML string at build time.
 * The pre-render script (scripts/prerender.mjs) imports and calls render()
 * after running `vite build --ssr src/entry-server.tsx`.
 *
 * Renders ONLY page content (no animated shell/sidebar) so the output
 * is safe for any environment without browser globals.
 */
import { renderToString } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { MotionConfig } from 'motion/react';
import { TenantProvider } from './app/context/TenantContext';
import { LanguageProvider } from './app/context/LanguageContext';
import { ThemeProvider } from './app/context/ThemeContext';
import { FontProvider } from './app/context/FontContext';

// Direct (non-lazy) imports so renderToString resolves them synchronously
import InfoPageWrapper from './app/pages/InfoPageWrapper';

const SSR_ROUTES = [{ path: '/info', element: <InfoPageWrapper /> }];

export function render(url: string): string {
  const router = createMemoryRouter(SSR_ROUTES, {
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
