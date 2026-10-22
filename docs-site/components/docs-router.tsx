'use client';

import { forwardRef, useMemo, type ReactNode } from 'react';
import Link from 'fumadocs-core/link';
import { usePathname, useRouter } from 'next/navigation';
import { HdsRouterProvider, type HdsLinkComponent } from '@hirobius/design-system';

/** HDS links (InlineLink, NavList) navigate client-side through Next, like Fumadocs' own links. */
const DocsLink: HdsLinkComponent = forwardRef(function DocsLink({ to, ...rest }, ref) {
  return <Link ref={ref} href={to} {...rest} />;
});

export function DocsRouter({ children }: { children: ReactNode }) {
  const router = useRouter();
  const currentPath = usePathname();
  const adapter = useMemo(
    () => ({ navigate: (href: string) => router.push(href), currentPath, LinkComponent: DocsLink }),
    [router, currentPath],
  );
  return (
    <HdsRouterProvider adapter={adapter}>
      <>{children}</>
    </HdsRouterProvider>
  );
}
