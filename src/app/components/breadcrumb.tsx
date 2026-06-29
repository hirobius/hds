/**
 * Breadcrumb - hierarchical navigation trail.
 * @category Navigation
 * @tier pattern
 */

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { useHdsRouter } from '../context/RouterContext';
import { Icon } from './icon';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface BreadcrumbItem {
  /** Visible label for the crumb. */
  label: string;
  /** Destination. Omit on the current (last) crumb to render it as plain text. */
  href?: string;
}

/** @public */
export interface BreadcrumbProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Ordered trail from root → current. The last item renders as the current page. */
  items: BreadcrumbItem[];
  /** Accessible label for the nav landmark. */
  label?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Breadcrumb trail. Links route through the HDS router seam (plain anchors with
 * no router, client-side nav when a router adapter is provided). The final item
 * is marked aria-current="page".
 */
export const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { items, label = 'Breadcrumb', className, ...props },
  ref,
) {
  const { LinkComponent } = useHdsRouter();

  return (
    <nav ref={ref} aria-label={label} className={cn('w-full', className)} {...props}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const linkable = Boolean(item.href) && !isLast;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
              {linkable ? (
                <LinkComponent
                  to={item.href as string}
                  style={hds.typeStyles.ui}
                  className="hds-focus text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </LinkComponent>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  style={hds.typeStyles.ui}
                  className={isLast ? 'text-foreground' : 'text-muted-foreground'}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <Icon
                  icon={ChevronRight}
                  size="small"
                  color="var(--semantic-color-content-secondary)"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
