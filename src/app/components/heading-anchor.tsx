// motion-ok: anchor link — opacity hover handled in CSS, no JS motion
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: doc-shell internal — TOC heading anchor wrapper, not part of public component surface
/**
 * HeadingAnchor — H2/H3 wrapper that registers a stable slug ID with the
 * doc-shell TOC and exposes a hover-revealed `#` deep-link icon.
 *
 * @category Layout
 *
 * 9d-6 contract:
 *   - Auto-derives a slug ID from heading text via the existing slugify util.
 *   - Registers (id, title) with TocProvider so DocTOC can render rails.
 *   - Renders an inline `<a href="#id">` with a `#` glyph that fades in on
 *     hover/focus. Click copies the absolute deep-link URL to the clipboard
 *     (falls back to anchor navigation if Clipboard API is unavailable).
 *   - Heading text is rendered as plain children — typography styling comes
 *     from the consuming doc page (Text / HeadingStack / etc).
 *
 * No surfaces, no role tokens, no margin — pure structural wrapper. Color
 * comes from inherited `text-foreground` / `text-muted-foreground` so this
 * component is theme-passive.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { useToc, slugify } from '../pages/hds/HdsTocContext';

type HdsHeadingLevel = 2 | 3;

export interface HeadingAnchorProps {
  /** Heading level — 2 → <h2>, 3 → <h3>. Drives TOC depth (DocTOC). */
  level: HdsHeadingLevel;
  /** Heading text content. Used to derive the slug ID and TOC label. */
  children: string;
  /** Optional explicit ID (overrides auto-slug). */
  id?: string;
  /** Optional className escape hatch on the heading element. */
  className?: string;
}

function copyDeepLink(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = `${window.location.origin}${window.location.pathname}#${id}`;
  if (navigator?.clipboard?.writeText) {
    void navigator.clipboard.writeText(url).catch(() => {});
    return true;
  }
  return false;
}

export function HeadingAnchor({
  level,
  children,
  id: explicitId,
  className,
}: HeadingAnchorProps) {
  const id = React.useMemo(() => explicitId ?? slugify(children), [explicitId, children]);
  const { register, unregister } = useToc();

  React.useEffect(() => {
    register({ id, title: children });
    return () => unregister(id);
  }, [id, children, register, unregister]);

  const Tag = (`h${level}` as 'h2' | 'h3');

  const handleAnchorClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Let modifier-clicks (open in new tab, save link, etc.) pass through.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      copyDeepLink(id);
    },
    [id],
  );

  return (
    <Tag
      id={id}
      data-hds-component="HeadingAnchor"
      data-hds-toc-level={level}
      className={cn('group scroll-mt-20', className)}
    >
      {children}
      <a
        href={`#${id}`}
        aria-label={`Copy link to ${children}`}
        onClick={handleAnchorClick}
        className={cn(
          'ml-2 inline-flex select-none align-baseline text-muted-foreground',
          'opacity-0 transition-opacity duration-150',
          'group-hover:opacity-100 focus-visible:opacity-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'rounded-sm',
        )}
      >
        <span aria-hidden="true">#</span>
      </a>
    </Tag>
  );
}

export default HeadingAnchor;
