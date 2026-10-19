import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
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
            <ThemeSwitch />
            <PreviewSwitches />
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
