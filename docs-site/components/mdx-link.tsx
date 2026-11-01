import { InlineLink } from '@hirobius/design-system';
import type { ComponentProps } from 'react';

/**
 * MDX `a` -> the HDS InlineLink, so a link in prose (Best practices, guides) looks like the
 * Figma / Source links and the demo links: one style, the external icon only on an external
 * URL. not-prose keeps Fumadocs' prose link rule (a heavier, darker underline) off it.
 * Internal hrefs go through the docs router adapter (components/docs-router.tsx).
 */
export function MdxLink({ href, children }: ComponentProps<'a'>) {
  if (!href) return <>{children}</>;
  return (
    <span className="not-prose">
      <InlineLink href={href}>
        {/* A fragment bridges the docs-site (React 19) and package (React 18) ReactNode types. */}
        <>{children}</>
      </InlineLink>
    </span>
  );
}
