import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { RootProvider } from 'fumadocs-ui/provider/next';

// HDS brand fonts (Plus Jakarta Sans variable, Sora 700, IBM Plex Mono 400), the same opt-in
// file consumers import, so the docs dogfood the package.
import '@hirobius/design-system/fonts.css';
import '@hirobius/design-system/tokens.css';
import './globals.css';

// Sans and display use the same woff2 files as fonts.css, but load through next/font: preloaded, with a
// metric-adjusted fallback face, so the webfont swap does not reflow the page
// (hds#761 layout-shift gate; the typography page's prose was 0.275 CLS). Mono is deliberately
// NOT here: code takes the package's own IBM Plex Mono face from fonts.css (one source).
const sans = localFont({
  src: '../../public/fonts/plus-jakarta-sans/plus-jakarta-sans-variable.woff2',
  weight: '200 800',
  variable: '--hds-docs-font-sans',
  display: 'swap',
});
const display = localFont({
  src: [{ path: '../../public/fonts/sora/sora-700.woff2', weight: '700' }],
  variable: '--hds-docs-font-display',
  display: 'swap',
});

export const metadata = {
  title: 'Hirobius Design System',
  description:
    'Documentation for the Hirobius Design System: foundations, components and patterns, themed with HDS tokens.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <RootProvider
          theme={{
            defaultTheme: 'system',
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
