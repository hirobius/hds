import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { ThemeToggle } from '@/components/theme-toggle';
import { PreviewSwitches } from '@/components/preview-switches';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Hirobius Design System',
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
