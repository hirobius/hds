'use client';

import { usePathname } from 'next/navigation';
import { useTreePath } from 'fumadocs-ui/contexts/tree';
import { topBarTitle } from '@/lib/site-name';

/** The current page's title in the top bar; empty on the home page (hds#845). */
export function TopBarTitle() {
  const pathname = usePathname();
  const names = useTreePath().map((node) => (typeof node.name === 'string' ? node.name : ''));
  const title = topBarTitle(pathname, names.filter(Boolean));
  return title ? <span className="hds-top-bar-title">{title}</span> : null;
}
