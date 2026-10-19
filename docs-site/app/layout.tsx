import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { RootProvider } from 'fumadocs-ui/provider/next';

// HDS brand fonts (Plus Jakarta Sans variable, Sora 800, IBM Plex Mono 400), the same opt-in
// file consumers import, so the docs dogfood the package.
import '@hirobius/design-system/fonts.css';
import '@hirobius/design-system/tokens.css';
import './globals.css';

// Same woff2 files as fonts.css, but loaded through next/font: preloaded, with a
// metric-adjusted fallback face, so the webfont swap does not reflow the page
// (hds#761 layout-shift gate; the typography page's prose was 0.275 CLS).
const sans = localFont({
  src: '../../public/fonts/plus-jakarta-sans/plus-jakarta-sans-variable.woff2',
  weight: '200 800',
  variable: '--hds-docs-font-sans',
  display: 'swap',
});
const display = localFont({
  src: [{ path: '../../public/fonts/sora/sora-800.woff2', weight: '800' }],
  variable: '--hds-docs-font-display',
  display: 'swap',
});
const mono = localFont({
  src: [{ path: '../../public/fonts/ibm-plex-mono/ibm-plex-mono-400.woff2', weight: '400' }],
  variable: '--hds-docs-font-mono',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata = {
  title: 'Hirobius Design System',
  description:
    'Documentation for the Hirobius Design System: foundations, components and patterns, themed with HDS tokens.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <RootProvider
          theme={{
            defaultTheme: 'light',
            // HDS's own dark-mode token values live under [data-theme="dark"]
            // (not a `.dark` class), so next-themes needs to write BOTH
            // attributes to <html> for Fumadocs' `.dark` chrome AND HDS's
            // token cascade to flip together.
            attribute: ['class', 'data-theme'],
          }}
          search={{ options: { type: 'static' } }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
