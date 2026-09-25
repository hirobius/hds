import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Head, Search } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import type { Metadata } from 'next';
import { ThemeBridge } from '../components/theme-bridge';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'HDS Docs',
    template: '%s — HDS Docs',
  },
  description: 'Hirobius Design System — component and token reference (Nextra proof of concept).',
};

const navbar = (
  <Navbar
    logo={
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: 'var(--semantic-color-surface-accent)',
          }}
        />
        Hirobius Design System
      </span>
    }
    projectLink="https://github.com/hirobius/hds"
  />
);

const footer = (
  <Footer>
    <span>
      {new Date().getFullYear()} © Hirobius — Nextra docs proof of concept, not the shipped docs
      site.
    </span>
  </Footer>
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/hirobius/hds/tree/main/docs-poc/nextra"
          footer={footer}
          search={<Search />}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          nextThemes={{ attribute: 'class', defaultTheme: 'system' }}
        >
          <ThemeBridge />
          {children}
        </Layout>
      </body>
    </html>
  );
}
