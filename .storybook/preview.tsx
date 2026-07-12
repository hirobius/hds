/**
 * Storybook 8 global preview — wraps every story with HDS providers and styles.
 */
import type { Preview } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '../src/app/context/ThemeContext';
import '../src/styles/index.css';

// ── Brand/density/theme modes matrix (#126) ─────────────────────────────────
//
// Only `data-theme` used to be exercised in Chromatic. A layout tweak for one
// tenant brand could silently shatter another with no visual coverage to
// catch it. MODES is the cross product of the four theming dials (ADR-023)
// this repo ships, minus font (a free-form CSS value, not enumerable):
//
//   dial      values exercised here
//   ────────  ──────────────────────────────────────────
//   brand     concrete-creations | lilac-bonds | brutalist-demo
//   density   comfortable | compact
//   theme     light | dark
//
// Applied per-file, not globally: import MODES and set it on ONE
// representative/all-variants story per component
// (`parameters: { chromatic: { modes: MODES } }`) — never on `meta`, which
// would multiply EVERY story in the file by (BRANDS x DENSITIES x THEMES)
// snapshots and blow the Chromatic snapshot budget. To add a tenant or a new
// axis value, extend BRANDS/DENSITIES/THEMES below; every file that already
// imports MODES picks up the new combination automatically. To wire up an
// additional component, import MODES here and apply it the same way.
//
// brutalist-demo (ADR-022, #128) is a Storybook-only shape/density exemplar
// — no deployment — proving role.radius/semantic.space overrides swap per
// tenant independent of color. See tenants/brutalist-demo/.
const BRANDS = ['concrete-creations', 'lilac-bonds', 'brutalist-demo'] as const;
const DENSITIES = ['comfortable', 'compact'] as const;
const THEMES = ['light', 'dark'] as const;

export const MODES: Record<string, { brand: string; density: string; theme: string }> = {};
for (const brand of BRANDS) {
  for (const density of DENSITIES) {
    for (const theme of THEMES) {
      MODES[`${brand}-${density}-${theme}`] = { brand, density, theme };
    }
  }
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Run axe-core on every story automatically.
      config: {},
    },
  },
  // Toolbar globals so the brand/density/theme dials are also switchable by
  // hand in the running Storybook (Chromatic drives the same globals per MODES
  // entry — see above — without touching the toolbar).
  globalTypes: {
    brand: {
      description: 'Tenant brand overlay (data-brand)',
      toolbar: {
        title: 'Brand',
        icon: 'paintbrush',
        items: [
          { value: '', title: 'Hirobius (base)' },
          ...BRANDS.map((brand) => ({ value: brand, title: brand })),
        ],
      },
    },
    density: {
      description: 'Spacing density (data-density)',
      toolbar: {
        title: 'Density',
        icon: 'ruler',
        items: DENSITIES.map((density) => ({ value: density, title: density })),
      },
    },
    theme: {
      description: 'Colour theme (data-theme)',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: THEMES.map((theme) => ({ value: theme, title: theme })),
      },
    },
  },
  initialGlobals: {
    density: 'comfortable',
    theme: 'light',
  },
  decorators: [
    // MemoryRouter mirrors the app shell: primitives such as Token call
    // react-router hooks (useNavigate/useLocation), which throw outside a
    // Router. Without this, any story rendering a Token (e.g. FoundationSwatch
    // with a tokenPath) errors in Chromatic. See src/app/components/token.tsx.
    // `data-hds` scopes the HDS base styles (Satoshi type baseline, resets,
    // theme-change transition) — they live under `:where([data-hds])`, so
    // without it every story falls back to the system sans and skips the base
    // baseline. The real docs site carries `data-hds` on <html>; mirror that
    // here so Storybook (and Chromatic) render stories in the true typeface.
    //
    // brand/density/theme come from context.globals — plain attribute
    // selectors ([data-brand="x"], [data-theme="dark"], etc.) match this div
    // directly, they don't require <html>, so setting them here is enough to
    // activate a tenant overlay for a story (same pattern already used by
    // src/stories/static-primitives.stories.tsx). Chromatic sets these
    // globals per MODES entry when a story opts in (see above); local
    // Storybook sets them from the toolbar.
    (Story, context) => {
      const { brand, density, theme } = context.globals as {
        brand?: string;
        density?: string;
        theme?: string;
      };
      return (
        <MemoryRouter>
          <ThemeProvider>
            <div
              data-hds
              data-brand={brand || undefined}
              data-tenant={brand || undefined}
              data-density={density || undefined}
              data-theme={theme || undefined}
              style={{ padding: '24px', minHeight: '100vh' }}
            >
              <Story />
            </div>
          </ThemeProvider>
        </MemoryRouter>
      );
    },
  ],
};

export default preview;
