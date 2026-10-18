import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { PreviewSwitches } from '@/components/preview-switches';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Hirobius Design System',
        children: <PreviewSwitches />,
      }}
    >
      {children}
    </DocsLayout>
  );
}
