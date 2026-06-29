/**
 * Pagination - paged navigation control with truncation.
 * @category Navigation
 * @tier pattern
 */
// motion-ok: every interactive control is a Button or IconButton, which own
// their hover/press motion feedback; Pagination adds no bespoke interactive
// surface of its own.

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { IconButton } from './icon-button';

// ── Range helper ─────────────────────────────────────────────────────────────
// Produces e.g. [1, 'ellipsis', 4, 5, 6, 'ellipsis', 20] for page 5 of 20.

type PageToken = number | 'ellipsis';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function paginationRange(
  page: number,
  count: number,
  siblingCount = 1,
): PageToken[] {
  // first + last + current + 2*siblings + 2 ellipses
  const totalSlots = siblingCount * 2 + 5;
  if (count <= totalSlots) return range(1, count);

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, count);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < count - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, siblingCount * 2 + 3), 'ellipsis', count];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, 'ellipsis', ...range(count - (siblingCount * 2 + 2), count)];
  }
  return [1, 'ellipsis', ...range(leftSibling, rightSibling), 'ellipsis', count];
}

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  count: number;
  /** Fired with the next page when a control is activated. */
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current page before truncating. */
  siblingCount?: number;
  /** Accessible label for the nav landmark. */
  label?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Paged navigation with first/last anchors, sibling pages, and ellipses. */
export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { page, count, onPageChange, siblingCount = 1, label = 'Pagination', className, ...props },
  ref,
) {
  if (count <= 1) return null;
  const tokens = paginationRange(page, count, siblingCount);
  const go = (next: number) => onPageChange(Math.max(1, Math.min(count, next)));

  return (
    <nav ref={ref} aria-label={label} className={cn('w-full', className)} {...props}>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <IconButton
            icon={ChevronLeft}
            size="sm"
            variant="tertiary"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => go(page - 1)}
          />
        </li>
        {tokens.map((token, index) =>
          token === 'ellipsis' ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-2 text-muted-foreground select-none"
            >
              …
            </li>
          ) : (
            <li key={token}>
              <Button
                variant={token === page ? 'secondary' : 'tertiary'}
                size="sm"
                aria-label={`Page ${token}`}
                aria-current={token === page ? 'page' : undefined}
                onClick={() => go(token)}
              >
                {token}
              </Button>
            </li>
          ),
        )}
        <li>
          <IconButton
            icon={ChevronRight}
            size="sm"
            variant="tertiary"
            aria-label="Next page"
            disabled={page >= count}
            onClick={() => go(page + 1)}
          />
        </li>
      </ul>
    </nav>
  );
});
