import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { ThemeToggle } from '@/components/theme-toggle';
import { PreviewSwitches } from '@/components/preview-switches';
import { SiteMark } from '@/components/site-mark';
import { TopBarTitle } from '@/components/top-bar-title';
import { SidebarGroupLabel } from '@/components/sidebar-group-label';
import { SearchTriggerFull, SearchTriggerSmall } from '@/components/search-trigger';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: <SiteMark />,
        children: <TopBarTitle />,
      }}
      slots={{ searchTrigger: { sm: SearchTriggerSmall, full: SearchTriggerFull } }}
      sidebar={{ components: { Separator: SidebarGroupLabel } }}
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
