/**
 * HdsDocsShell — three-region docs shell (left nav rail, content, right TOC
 * rail), driven by grid columns that default to 0 and are set per breakpoint.
 * @category Layout
 * @tier pattern
 * @public
 *
 * hds#280 slice: this is the SHELL MECHANICS ONLY — the smallest shippable
 * piece of the docs-shell epic. It ships:
 *
 *   - A 3-column grid (`leftRail | content | rightRail`), both rail columns
 *     defaulting to `0px` and set to `semantic.space.sidebar.railWidth`
 *     (hds#280 token, our own 280px — not HeroUI's 268px) per breakpoint via
 *     Tailwind's arbitrary-property + responsive-variant syntax, the same
 *     technique Fumadocs/HeroUI uses. `md768:` brings in the left rail,
 *     `xl1280:` brings in the right rail — matching the three-stage table in
 *     hds#280.
 *   - Each rail is `position: sticky` and scrolls independently of content
 *     and of the other rail, clipped to the viewport minus `topOffset`.
 *   - `topOffset` composes (it is one CSS length a caller supplies, e.g. its
 *     own sticky header's height token) rather than a hardcoded pixel value —
 *     the first stage of the row-cascade pattern hds#280 asks for. A second
 *     region (a tabs row, hds#280's PR-comment addendum) would extend this by
 *     adding its own height into the same `calc()` chain, not by hardcoding a
 *     second offset.
 *
 * Deliberately NOT in this slice (tracked as proposed follow-up issues, not
 * filed — see the PR/commit this ships in):
 *   - Below the TOC breakpoint, `rightRail` is omitted from the grid rather
 *     than becoming a reachable popover. The DoD explicitly wants a popover,
 *     not "merely hidden" — that is real, separate UI work (a sticky
 *     current-section breadcrumb bar), not shell mechanics.
 *   - Left-rail collapsible groups (chevron, active-section pill) and
 *     right-rail active-anchor styling (vertical rule, filled pill) are
 *     content the caller supplies via `leftRail`/`rightRail` — this shell
 *     does not build SideNav/Disclosure/NavItem composition for the caller.
 *   - `check-rendered-geometry` verification at every breakpoint in the DoD's
 *     table (needs a built Storybook + a live run, not exercised here).
 *   - Named CSS `grid-template-areas` (the DoD's literal ask) — this ships a
 *     3-column grid with DOM order instead, which is behaviorally identical
 *     for a single linear row of regions and needs no separate stylesheet.
 *     Areas earn their keep once a 4th region (a tabs row spanning full
 *     width) is added — call out then, not before.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

const RAIL_WIDTH = 'var(--semantic-space-sidebar-railWidth)';

/** @public */
export interface HdsDocsShellProps {
  /** Left nav rail. Hidden below the `md768` breakpoint (grid column width 0). */
  leftRail?: React.ReactNode;
  /** Main content column. Always rendered, always fluid. */
  children: React.ReactNode;
  /**
   * Right "on this page" rail. Hidden below the `xl1280` breakpoint (grid
   * column width 0) — see the deferred-popover note above; it is REMOVED
   * from the grid at that breakpoint, not merely visually hidden, so no
   * hidden interactive content sits in the DOM unreachable.
   */
  rightRail?: React.ReactNode;
  /**
   * CSS length a caller supplies for a sticky header ABOVE this shell (e.g.
   * TopNav's height token), so each rail's sticky offset and scrollable
   * height compose against it instead of assuming the shell owns the whole
   * viewport. Defaults to `'0px'`.
   */
  topOffset?: string;
  /** Escape hatch: only for narrow layout adjustments that don't belong in the primitive API. */
  className?: string;
  /** Escape hatch: only for narrow layout adjustments that don't belong in the primitive API. */
  style?: React.CSSProperties;
}

/** @public */
export const HdsDocsShell = React.forwardRef<HTMLDivElement, HdsDocsShellProps>(
  function HdsDocsShell(
    { leftRail, children, rightRail, topOffset = '0px', className, style },
    ref,
  ) {
    const railStyle: React.CSSProperties = {
      position: 'sticky',
      top: topOffset,
      height: `calc(100dvh - ${topOffset})`,
      overflowY: 'auto',
      minWidth: 0,
    };

    return (
      <div
        ref={ref}
        data-hds-component="HdsDocsShell"
        className={cn(
          'grid w-full items-start',
          'grid-cols-[0px_minmax(0,1fr)_0px]',
          '[--hds-docs-shell-left:0px] [--hds-docs-shell-right:0px]',
          'md768:[--hds-docs-shell-left:var(--hds-docs-shell-rail-width)]',
          'xl1280:[--hds-docs-shell-right:var(--hds-docs-shell-rail-width)]',
          'md768:grid-cols-[var(--hds-docs-shell-left)_minmax(0,1fr)_var(--hds-docs-shell-right)]',
          className,
        )}
        style={
          {
            '--hds-docs-shell-rail-width': RAIL_WIDTH,
            ...style,
          } as React.CSSProperties
        }
      >
        {leftRail !== undefined && (
          <div className="hidden md768:block" style={railStyle}>
            {leftRail}
          </div>
        )}
        <div style={{ minWidth: 0 }}>{children}</div>
        {rightRail !== undefined && (
          <div className="hidden xl1280:block" style={railStyle}>
            {rightRail}
          </div>
        )}
      </div>
    );
  },
);
