import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';

import '@hirobius/design-system/tokens.css';
import './globals.css';

export const metadata = {
  title: 'HDS Docs (Fumadocs POC)',
  description:
    'Proof-of-concept documentation site for the Hirobius Design System, built on Fumadocs and themed with real HDS tokens.',
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
