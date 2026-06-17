// motion-ok: TOC link list — scrollspy active-state via CSS, no transition motion
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: doc-shell internal — right-rail TOC, not part of public component surface
/**
 * DocTOC — right-rail "On this page" table of contents for /hds doc routes.
 *
 * @category Layout
 *
 * 9d-6 contract:
 *   - Reads registered headings from TocProvider (via useToc) — populated by
 *     HeadingAnchor wrappers around H2/H3 in the doc-page content column.
 *   - IntersectionObserver-based scrollspy: each registered heading element
 *     is observed; the topmost intersecting heading (within the activation
 *     band) drives the active highlight. Threshold: 0 with a rootMargin band
 *     of `-80px 0px -65% 0px` — the top 80px is the sticky-header dead-zone,
 *     the bottom 65% trims the activation window so a heading must scroll
 *     past the top third before it activates.
 *   - Anchor click smooth-scrolls to the heading and updates the URL hash
 *     without a full page jump.
 *   - Renders nothing if there are no registered headings (keeps the rail
 *     visually quiet on doc pages without H2/H3 content).
 *
 * Surface: bg-background + border-l border-border (composed by DocShell's
 * right-rail container — this component handles its own internal padding /
 * typography only).
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { useToc } from '../pages/hds/HdsTocContext';

// Activation band:
//   - Top:    80px (sticky doc-shell header is 48px; +32px breathing room)
//   - Bottom: -65% of viewport (heading must scroll into the upper third)
// rootMargin = "-80px 0px -65% 0px"  ←  exposed for the report and tests.
const TOC_ROOT_MARGIN = '-80px 0px -65% 0px';
const TOC_THRESHOLD = 0;

function useScrollspy(ids: string[]): string {
  const [activeId, setActiveId] = React.useState<string>(ids[0] ?? '');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId('');
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setActiveId(ids[0] ?? '');
      return;
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) {
      setActiveId(ids[0] ?? '');
      return;
    }

    // Track which IDs are currently within the activation band; pick the
    // topmost (smallest boundingClientRect.top) on every observer callback.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }

        if (visible.size === 0) return;

        // Order by source position (TOC items registration order) and pick
        // the first one that is currently visible.
        const next = ids.find((id) => visible.has(id));
        if (next) {
          setActiveId((current) => (current === next ? current : next));
        }
      },
      { rootMargin: TOC_ROOT_MARGIN, threshold: TOC_THRESHOLD },
    );

    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

export interface DocTOCProps {
  /** Optional className escape hatch on the outer <nav> wrapper. */
  className?: string;
}

export function DocTOC({ className }: DocTOCProps) {
  const { items } = useToc();
  const ids = React.useMemo(() => items.map((item) => item.id), [items]);
  const activeId = useScrollspy(ids);

  if (items.length === 0) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <nav
      data-hds-component="DocTOC"
      aria-label="On this page"
      className={cn('flex flex-col gap-3 px-4 py-6', className)}
    >
      <p className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'block rounded-md px-2 py-1 text-sm',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && 'bg-muted text-foreground',
                )}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
