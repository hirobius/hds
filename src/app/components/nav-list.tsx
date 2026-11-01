/**
 * NavList - a vertical list of rows with one marked as the current page, or the selected one.
 * @category Navigation
 * @tier pattern
 * @usage List sibling destinations as rows that can hold a title, a meta line and a badge, with the open one marked current (a rail of jobs, documents or records).
 * @whenNot Switching views inside one page, or a trail back up a hierarchy.
 * @useInstead Tabs switching between views on the same page
 * @useInstead Breadcrumb showing where the current page sits in a hierarchy
 * @useInstead Menu a list of actions rather than destinations
 * @slot item A NavList.Item: one row holding any content, a link (`href`) or a button that selects in place (`onSelect`).
 * @a11y component required a11y:nav-list.list-of-links The rows are links in an unordered list, so a screen reader announces the list and its length.
 * @a11y component required a11y:nav-list.current-page The current item is marked aria-current=page and the others carry no aria-current.
 * @a11y component required a11y:nav-list.keyboard-focus Tab visits each link in order and each shows the focus ring.
 * @a11y component required a11y:nav-list.select-button With onSelect a row is a button in the list, not a link, so a screen reader announces a button and Enter or Space selects it.
 * @a11y component required a11y:nav-list.select-current The selected row is marked aria-current=true and the others carry no aria-current.
 * @a11y component required a11y:nav-list.select-keyboard Tab visits each row, Enter and Space select it, and each shows the focus ring.
 * @a11y consumer required Put the list in a nav landmark with a distinct label, or give NavList an aria-label, and give an item an aria-label when its text does not read well as one link name.
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
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- hover/selected fills are token-driven; var()-based, no Tailwind-theme utility exists
const navListItemVariants = /* @__PURE__ */ cva(
  'hds-focus hds-type-ui block rounded-md px-fixed-xs py-scale-xs text-foreground no-underline transition-colors hover:bg-[var(--semantic-color-surface-hover)]',
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
export interface NavListLinkItemProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onSelect'
> {
  /** Destination route or URL. */
  href: string;
  /** Marks this row as the current page (aria-current="page"). */
  current?: boolean;
  /** Select mode only; not allowed with `href`. */
  onSelect?: never;
  /** Select mode only; not allowed with `href`. */
  selected?: never;
  /** The row's content: a title line, a meta line, a badge. */
  children?: React.ReactNode;
}

/** @public */
export interface NavListSelectItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onSelect' | 'type'
> {
  /** Called when the row is chosen (click, Enter or Space). Makes the row a button that selects in place; not allowed with `href`. */
  onSelect: () => void;
  /** Marks this row as the selected one (aria-current="true"). */
  selected?: boolean;
  href?: never;
  current?: never;
  /** The row's content: a title line, a meta line, a badge. */
  children?: React.ReactNode;
}

/** @public */
export type NavListItemProps = NavListLinkItemProps | NavListSelectItemProps;

// ── Components ─────────────────────────────────────────────────────────────────

/**
 * One row of a NavList. With `href` it is a link routed through the HDS router
 * seam (a plain anchor with no router) and sets aria-current="page" when
 * `current`. With `onSelect` it is a button that selects in place and sets
 * aria-current="true" when `selected`. `href` and `onSelect` are exclusive.
 */
export const NavListItem = /* @__PURE__ */ React.forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  NavListItemProps
>(function NavListItem(props, ref) {
  const { LinkComponent } = useHdsRouter();
  if (typeof props.onSelect === 'function') {
    const {
      onSelect,
      selected = false,
      href: _href,
      current: _current,
      className,
      children,
      onClick,
      ...rest
    } = props as NavListSelectItemProps;
    return (
      <li>
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          aria-current={selected ? 'true' : undefined}
          className={cn(
            navListItemVariants({ current: selected }),
            'hds-focus w-full text-left',
            className,
          )}
          onClick={(event) => {
            onClick?.(event);
            if (!event.defaultPrevented) onSelect();
          }}
          {...rest}
        >
          {children}
        </button>
      </li>
    );
  }
  const {
    href,
    current = false,
    onSelect: _onSelect,
    selected: _selected,
    className,
    children,
    ...rest
  } = props as NavListLinkItemProps;
  return (
    <li>
      <LinkComponent
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={href}
        aria-current={current ? 'page' : undefined}
        className={cn(navListItemVariants({ current }), className)}
        {...rest}
      >
        {children}
      </LinkComponent>
    </li>
  );
});

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
 * A vertical list of rows (links, or buttons that select in place), one marked current. Rows hold rich content; hover
 * fills with surface.hover; the current row holds the deeper surface.selected.
 * Tagged here rather than in the file block because NavListItem shares this
 * module and maps to its own Figma set through figma/mapping-overrides.json.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2209-26
 */
export const NavList: NavListComponent = /* @__PURE__ */ Object.assign(NavListRoot, {
  Item: NavListItem,
});
