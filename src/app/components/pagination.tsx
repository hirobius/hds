/**
 * Pagination - paged navigation control with truncation.
 * @category Navigation
 * @tier pattern
 * @usage Move between pages of a long result set, with truncated page numbers.
 * @whenNot A hierarchy trail, or a short list that fits on one page.
 * @useInstead Breadcrumb a hierarchy trail
 * @a11y component required a11y:pagination.nav-landmark The controls are a navigation landmark with an accessible name (default Pagination).
 * @a11y component required a11y:pagination.control-names Previous, Next and every page number have an accessible name (Previous page, Next page, Page N).
 * @a11y component required a11y:pagination.current-page Only the current page is marked aria-current=page.
 * @a11y component required a11y:pagination.disabled-ends Previous is disabled on the first page and Next on the last.
 * @a11y component required a11y:pagination.ellipsis-hidden The truncation ellipsis is hidden from assistive technology.
 * @a11y component required a11y:pagination.keyboard Tab reaches every control and Enter and Space change the page.
 * @a11y component required a11y:pagination.focus-kept When activating Previous or Next disables the focused button, focus moves to the current page instead of being stranded.
 * @a11y component required a11y:pagination.target-size Previous and Next are 32px and page buttons lift to the touch target, over the 24px floor (WCAG 2.5.8).
 * @a11y consumer recommended After a page change, keep focus on the control or move it to the start of the results, and tell screen-reader users the results changed.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=86-194
 */
// motion-ok: every interactive control is a Button, which owns its hover/press
// motion feedback; Pagination adds no bespoke interactive surface of its own.

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Icon } from './icon';

// ── Range helper ─────────────────────────────────────────────────────────────
// Produces e.g. [1, 'ellipsis', 4, 5, 6, 'ellipsis', 20] for page 5 of 20.

type PageToken = number | 'ellipsis';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function paginationRange(page: number, count: number, siblingCount = 1): PageToken[] {
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

/** Where a rendered slot shows: everywhere, only at sm and up, or only below sm. */
type SlotReach = 'all' | 'wide' | 'narrow';
type Slot = { token: PageToken; reach: SlotReach };

/**
 * One row that renders the wide range (`siblingCount`) at sm and up and the compact range (no
 * siblings) below sm. Pages only the wide range shows are `wide`; a run they leave uncovered on a
 * phone gets its own `narrow` ellipsis, so neither row ever skips pages without one.
 */
function paginationSlots(page: number, count: number, siblingCount: number): Slot[] {
  const pagesOf = (tokens: PageToken[]) => tokens.filter((t): t is number => t !== 'ellipsis');
  const wide = new Set(pagesOf(paginationRange(page, count, siblingCount)));
  const narrow = new Set(pagesOf(paginationRange(page, count, 0)));
  const all = [...new Set([...wide, ...narrow])].sort((a, b) => a - b);
  const slots: Slot[] = [];
  let lastWide = 0;
  let lastNarrow = 0;
  for (const p of all) {
    const inWide = wide.has(p);
    const inNarrow = narrow.has(p);
    const wideGap = inWide && lastWide > 0 && p - lastWide > 1;
    const narrowGap = inNarrow && lastNarrow > 0 && p - lastNarrow > 1;
    if (wideGap && narrowGap) slots.push({ token: 'ellipsis', reach: 'all' });
    else if (wideGap) slots.push({ token: 'ellipsis', reach: 'wide' });
    else if (narrowGap) slots.push({ token: 'ellipsis', reach: 'narrow' });
    slots.push({ token: p, reach: inWide && inNarrow ? 'all' : inWide ? 'wide' : 'narrow' });
    if (inWide) lastWide = p;
    if (inNarrow) lastNarrow = p;
  }
  return slots;
}

const REACH_CLASS: Record<SlotReach, string | undefined> = {
  all: undefined,
  wide: 'max-sm:hidden',
  narrow: 'sm:hidden',
};

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
export const Pagination = /* @__PURE__ */ React.forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    { page, count, onPageChange, siblingCount = 1, label = 'Pagination', className, ...props },
    ref,
  ) {
    const navRef = React.useRef<HTMLElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLElement | null) => {
        navRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    // Activating Previous on page 2 (or Next on the second-last page) disables the
    // very button holding focus, and a disabled button takes no keys: keyboard users
    // would be stranded (2.4.3). Move focus to the current page button instead.
    React.useEffect(() => {
      const active = document.activeElement;
      const nav = navRef.current;
      if (!nav || !(active instanceof HTMLButtonElement) || !active.disabled) return;
      if (!nav.contains(active)) return;
      nav.querySelector<HTMLButtonElement>('button[aria-current="page"]')?.focus();
    });

    if (count <= 1) return null;
    const go = (next: number) => onPageChange(Math.max(1, Math.min(count, next)));
    // Below 640px the 44px touch targets leave room for about seven slots, so the sibling pages step aside
    // (kept at sm and up) and the first, current and last pages stay: no wrapped second row (item 15).
    // Every run of pages a row skips keeps its ellipsis in that row.
    const slots = paginationSlots(page, count, siblingCount);

    return (
      <nav ref={setRefs} aria-label={label} className={cn('w-full', className)} {...props}>
        <ul className="flex flex-wrap items-center gap-1">
          <li>
            <Button
              iconOnly
              size="sm"
              variant="tertiary"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => go(page - 1)}
              iconLeft={<Icon icon={ChevronLeft} size="small" />}
            />
          </li>
          {slots.map(({ token, reach }, index) =>
            token === 'ellipsis' ? (
              <li
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className={cn('px-2 text-muted-foreground select-none', REACH_CLASS[reach])}
              >
                …
              </li>
            ) : (
              <li key={token} className={REACH_CLASS[reach]}>
                <Button
                  variant={token === page ? 'secondary' : 'tertiary'}
                  size="sm"
                  className="hds-touch-target"
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
            <Button
              iconOnly
              size="sm"
              variant="tertiary"
              aria-label="Next page"
              disabled={page >= count}
              onClick={() => go(page + 1)}
              iconLeft={<Icon icon={ChevronRight} size="small" />}
            />
          </li>
        </ul>
      </nav>
    );
  },
);
