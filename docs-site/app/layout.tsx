import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';

// HDS brand fonts (Satoshi 400/500/700 + IBM Plex Mono 400), the same opt-in
// file consumers import, so the docs dogfood the package.
import '@hirobius/design-system/fonts.css';
import '@hirobius/design-system/tokens.css';
import './globals.css';

export const metadata = {
  title: 'Hirobius Design System',
  description:
    'Documentation for the Hirobius Design System: foundations, components and patterns, themed with HDS tokens.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
