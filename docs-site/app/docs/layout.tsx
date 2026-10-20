import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { ThemeToggle } from '@/components/theme-toggle';
import { PreviewSwitches } from '@/components/preview-switches';
import { SITE_MARK } from '@/lib/site-name';
import { TopBarTitle } from '@/components/top-bar-title';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: SITE_MARK,
        children: <TopBarTitle />,
      }}
      themeSwitch={{
        component: (
          <div className="hds-docs-display">
            <ThemeToggle />
            <PreviewSwitches />
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
