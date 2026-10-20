/**
 * NavList - a vertical list of links with one marked as the current page.
 * @category Navigation
 * @tier pattern
 * @usage List sibling destinations as rows that can hold a title, a meta line and a badge, with the open one marked current (a rail of jobs, documents or records).
 * @whenNot Switching views inside one page, or a trail back up a hierarchy.
 * @useInstead Tabs switching between views on the same page
 * @useInstead Breadcrumb showing where the current page sits in a hierarchy
 * @useInstead Menu a list of actions rather than destinations
 * @slot item A NavList.Item: one link row holding any content.
 * @a11y component required a11y:nav-list.list-of-links The rows are links in an unordered list, so a screen reader announces the list and its length.
 * @a11y component required a11y:nav-list.current-page The current item is marked aria-current=page and the others carry no aria-current.
 * @a11y component required a11y:nav-list.keyboard-focus Tab visits each link in order and each shows the focus ring.
 * @a11y consumer required Put the list in a nav landmark with a distinct label, or give NavList an aria-label, and give an item an aria-label when its text does not read well as one link name.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2209-26
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useHdsRouter } from '../context/RouterContext';

// ── Variants ───────────────────────────────────────────────────────────────────
// `current` is a component-specific state flag (not one of the contract's four
// axes), like Breadcrumb's: hover is surface.hover and the open row is
// surface.selected (one step deeper), so the two never read the same. The weight stays
// on the ui role (medium): the type ramp has no heavier row weight, so the fill
// and aria-current carry the state.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- row padding and hover/selected fills are token-driven; var()-based, no Tailwind-theme utility exists
const navListItemVariants = /* @__PURE__ */ cva(
  'hds-focus hds-type-ui block rounded-md px-[var(--primitive-space-3)] py-[var(--semantic-space-scale-xs)] text-foreground no-underline transition-colors hover:bg-[var(--semantic-color-surface-hover)]',
  {
    variants: {
      current: {
        true: 'bg-[var(--semantic-color-surface-selected)] hover:bg-[var(--semantic-color-surface-selected)]',
        false: '',
      },
    },
    defaultVariants: { current: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface NavListProps extends React.HTMLAttributes<HTMLUListElement> {
  /** NavList.Item rows. */
  children?: React.ReactNode;
}

/** @public */
export interface NavListItemProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  /** Destination route or URL. */
  href: string;
  /** Marks this row as the current page (aria-current="page"). */
  current?: boolean;
  /** The row's content: a title line, a meta line, a badge. */
  children?: React.ReactNode;
}

// ── Components ─────────────────────────────────────────────────────────────────

/**
 * One link row of a NavList. Routes through the HDS router seam (a plain anchor
 * with no router) and sets aria-current="page" when `current`.
 */
export const NavListItem = /* @__PURE__ */ React.forwardRef<HTMLAnchorElement, NavListItemProps>(
  function NavListItem({ href, current = false, className, children, ...props }, ref) {
    const { LinkComponent } = useHdsRouter();
    return (
      <li>
        <LinkComponent
          ref={ref}
          to={href}
          aria-current={current ? 'page' : undefined}
          className={cn(navListItemVariants({ current }), className)}
          {...props}
        >
          {children}
        </LinkComponent>
      </li>
    );
  },
);

type NavListComponent = React.ForwardRefExoticComponent<
  NavListProps & React.RefAttributes<HTMLUListElement>
> & { Item: typeof NavListItem };

const NavListRoot = /* @__PURE__ */ React.forwardRef<HTMLUListElement, NavListProps>(
  function NavList({ className, children, ...props }, ref) {
    return (
      <ul
        ref={ref}
        className={cn(
          'm-0 flex list-none flex-col gap-[var(--semantic-space-subgrid-gap)] p-0',
          className,
        )}
        {...props}
      >
        {children}
      </ul>
    );
  },
);

/**
 * A vertical list of links, one marked current. Rows hold rich content; hover
 * fills with surface.hover; the current row holds the deeper surface.selected.
 */
export const NavList: NavListComponent = /* @__PURE__ */ Object.assign(NavListRoot, {
  Item: NavListItem,
});
