/**
 * List - an inset grouped list: titled groups of tappable rows on a raised surface.
 * @category Display
 * @tier pattern
 * @usage Show groups of records (roles, documents, settings) as rows with a leading tile, a title, one description line, one meta line and one quiet trailing affordance; the whole row opens the record.
 * @whenNot A rail of sibling pages with one marked current, term and value pairs, or a data grid with columns.
 * @useInstead NavList a rail of destinations with the open one marked current
 * @useInstead MetadataList term and value pairs about one object
 * @useInstead Table rows compared across columns
 * @slot group A List.Group: a heading outside the surface (title, count Badge, optional action) over a ul of rows.
 * @slot item A List.Item: leading, title, description, meta and one trailing affordance (chevron, count or icon button), or an overflow Menu via `actions`.
 * @slot status A row's `status` ({ value, label }) in the meta line or, with statusIn="trailing", before the trailing affordance; the List's `defaultStatus` hides the default one. Entity rows use variant="plain" divider="none": spacing, not hairlines, separates them.
 * @slot empty A List.Empty: an EmptyState row shown when the group has no items.
 * @a11y component required a11y:list.list-semantics Each group is a ul of li rows, labelled by its heading, so a screen reader announces the list, its name and its length.
 * @a11y component required a11y:list.row-name The row link or button is named by its title alone; the description and meta are its accessible description.
 * @a11y component required a11y:list.select-button With onSelect the row is a button named by its title, reached by Tab and fired by Enter or Space, with the focus ring.
 * @a11y component required a11y:list.overflow-menu Secondary actions sit in a Menu whose trigger is named "More actions for <title>" and sits beside the row link, never inside it.
 * @a11y component required a11y:list.decorative-affordances The leading tile and the chevron are hidden from assistive technology.
 * @a11y consumer required Give an icon-only trailing button its own label, and keep the title unique within a group so each row reads as a distinct link.
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { ChevronRight, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHdsRouter } from '../context/RouterContext';
import { Badge } from './badge';
import { Button } from './button';
import { EmptyState, type EmptyStateProps } from './empty-state';
import { Icon } from './icon';
import { Menu } from './menu';
import { Surface } from './surface';
import { Text } from './text';

// ── Variants ───────────────────────────────────────────────────────────────────
// The list, not the row, draws the dividers: a top rule on every row after the
// first, starting at the text column (`--hds-local-list-text-start`), which is
// past the leading tile on a row that has one. `inset` puts the rows on a raised
// rounded Surface; `plain` is the same rows with no surface, for page feeds.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven divider inset; var()-based, no Tailwind-theme utility exists
const listRowsVariants = /* @__PURE__ */ cva('m-0 flex list-none flex-col p-0', {
  variants: {
    variant: {
      inset: 'overflow-hidden shadow-[var(--semantic-elevation-raised-shadow)]',
      plain: '',
    },
    divider: {
      inset:
        "[--hds-local-list-text-start:var(--component-list-rowPadding)] [&>li[data-leading]]:[--hds-local-list-text-start:calc(var(--component-list-rowPadding)*2+var(--component-list-leadingSize))] [&>li]:relative [&>li+li]:before:pointer-events-none [&>li+li]:before:absolute [&>li+li]:before:top-0 [&>li+li]:before:right-0 [&>li+li]:before:left-[var(--hds-local-list-text-start)] [&>li+li]:before:border-t [&>li+li]:before:border-border [&>li+li]:before:content-['']",
      // Entity rows: spacing separates them, never hairlines (plain only).
      none: 'gap-scale-xs',
    },
  },
  defaultVariants: { variant: 'inset', divider: 'inset' },
});

// Token-driven row metrics, fills and text colours: var()-based, no Tailwind-theme utility exists.
const SLOT = {
  tile: 'inline-flex size-[var(--component-list-leadingSize)] items-center justify-center rounded-md bg-[var(--semantic-color-surface-sunken)] text-[var(--semantic-color-content-secondary)]',
  chevron: 'flex shrink-0 text-[var(--semantic-color-content-tertiary)]',
  description: 'hds-type-ui block truncate text-[var(--semantic-color-content-secondary)]',
  meta: 'hds-type-caption block truncate text-[var(--semantic-color-content-tertiary)]',
  control: 'flex shrink-0 items-center pr-[var(--component-list-rowPadding)]',
  empty: 'p-[var(--component-list-rowPadding)]',
  status: 'hds-type-caption flex shrink-0 text-[var(--semantic-color-content-tertiary)]',
} as const;

const ROW =
  'hds-focus flex min-h-[var(--component-list-rowMinHeight)] min-w-0 flex-1 items-center gap-[var(--component-list-rowPadding)] p-[var(--component-list-rowPadding)] text-left text-foreground no-underline transition-colors hover:bg-[var(--semantic-color-surface-hover)] active:bg-[var(--semantic-color-surface-selected)]';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type ListVariant = 'inset' | 'plain';

interface ListContextValue {
  variant: ListVariant;
  divider: 'inset' | 'none';
  defaultStatus?: string;
}
const ListVariantContext = /* @__PURE__ */ React.createContext<ListContextValue>({
  variant: 'inset',
  divider: 'inset',
});

interface ListBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A status value the host treats as the default: rows with this `status.value` hide their status. */
  defaultStatus?: string;
  /** List.Group children. */
  children?: React.ReactNode;
}

/** @public */
export type ListProps = ListBaseProps &
  (
    | {
        /** `inset` (default): rows on a raised rounded surface. */
        variant?: 'inset';
        divider?: 'inset';
      }
    | {
        /** `plain`: no surface, for page feeds. */
        variant: 'plain';
        /** `none`: no dividers; rows are separated by spacing (entity rows). Plain only. */
        divider?: 'inset' | 'none';
      }
  );

/** A row's status: `value` is compared with the list's `defaultStatus`, `label` is shown. */
/** @public */
export interface ListItemStatus {
  value: string;
  label: React.ReactNode;
}

/** @public */
export interface ListGroupProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** The group heading, shown above the surface. */
  title: React.ReactNode;
  /** A count shown as a Badge beside the title. */
  count?: number;
  /** One optional action at the end of the heading (a link-style Button). */
  action?: React.ReactNode;
  /** Heading level of the title. Defaults to 2. */
  headingLevel?: 2 | 3 | 4;
  /** List.Item rows, or a List.Empty. */
  children?: React.ReactNode;
}

/** The one quiet trailing affordance: a chevron, a count, or an icon button. */
/** @public */
export type ListItemTrailing = 'chevron' | number | React.ReactElement;

interface ListItemBaseProps {
  /** The row's title; it names the row link or button. */
  title: React.ReactNode;
  /** One line of supporting text, truncated. */
  description?: React.ReactNode;
  /** One line of tertiary metadata (a date, a source), truncated. */
  meta?: React.ReactNode;
  /** A List.Tile or a logo image, before the text column. */
  leading?: React.ReactNode;
  /** The row's status, shown in the meta line or in trailing (`statusIn`). */
  status?: ListItemStatus;
  /** Where the status goes: `meta` (default) or `trailing`, before the trailing affordance. */
  statusIn?: 'meta' | 'trailing';
  /** Extra classes on the row link or button. */
  className?: string;
}

type ListItemTrailingProps =
  | {
      /** One quiet trailing affordance: `'chevron'`, a count, or an icon Button. */
      trailing?: ListItemTrailing;
      actions?: never;
    }
  | {
      trailing?: never;
      /** Menu.Item children for the overflow menu. Takes the trailing slot. */
      actions: React.ReactNode;
    };

type ListItemTargetProps =
  | {
      /** Destination; the whole row is a link. */
      href: string;
      onSelect?: never;
    }
  | {
      href?: never;
      /** Makes the whole row a button. */
      onSelect: () => void;
    };

/** @public */
export type ListItemProps = ListItemBaseProps & ListItemTrailingProps & ListItemTargetProps;

/** @public */
export interface ListTileProps {
  /** The tile's icon. */
  icon: LucideIcon;
  /** Extra classes on the tile. */
  className?: string;
}

/** @public */
export type ListEmptyProps = Omit<EmptyStateProps, 'variant' | 'framed'>;

// ── Components ─────────────────────────────────────────────────────────────────

/**
 * The leading icon tile: a sunken rounded square at component.list.leadingSize.
 * @usage Put an icon in a sunken square at the start of a List.Item (its `leading`).
 */
export function ListTile({ icon, className }: ListTileProps) {
  return (
    <span className={cn(SLOT.tile, className)}>
      <Icon icon={icon} size="small" />
    </span>
  );
}

/**
 * One row: the whole row is the link (or button); an icon button or overflow menu sits beside it.
 * @usage One record in a List.Group: a title, a description, a meta line and one trailing affordance, the whole row tappable.
 */
export function ListItem(props: ListItemProps) {
  const { LinkComponent } = useHdsRouter();
  const { title, description, leading, className, trailing, actions, statusIn = 'meta' } = props;
  const { defaultStatus } = React.useContext(ListVariantContext);
  const status =
    props.status != null && props.status.value !== defaultStatus ? props.status : undefined;
  const statusNode = status != null && (
    <span data-slot="list-status" className="block min-w-0 shrink truncate">
      {status.label}
    </span>
  );
  const meta =
    statusIn === 'meta' && statusNode ? (
      <span className="flex min-w-0 items-center gap-scale-xs">
        {props.meta != null && <span className="min-w-0 truncate">{props.meta}</span>}
        {statusNode}
      </span>
    ) : (
      props.meta
    );
  const id = React.useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  const both = trailing != null && actions != null;
  React.useEffect(() => {
    if (both)
      console.warn(
        '[HDS] List.Item takes one trailing affordance: `actions` replaces `trailing`. Drop one.',
      );
  }, [both]);

  const control =
    actions != null ? (
      <Menu>
        <Menu.Trigger asChild>
          <Button
            variant="tertiary"
            iconOnly
            label={`More actions for ${typeof title === 'string' ? title : 'this row'}`}
            iconLeft={<Icon icon={MoreHorizontal} size="small" />}
          />
        </Menu.Trigger>
        <Menu.Content align="end">{actions}</Menu.Content>
      </Menu>
    ) : React.isValidElement(trailing) ? (
      trailing
    ) : null;

  const inner =
    trailing === 'chevron' && actions == null ? (
      <span data-slot="list-trailing" aria-hidden="true" className={SLOT.chevron}>
        <Icon icon={ChevronRight} size="small" />
      </span>
    ) : typeof trailing === 'number' && actions == null ? (
      <span id={`${descId}-c`} data-slot="list-trailing" className="flex shrink-0">
        <Badge count={trailing} />
      </span>
    ) : null;

  const hasDesc = description != null || meta != null;
  const body = (
    <>
      {leading != null && (
        <span data-slot="list-leading" aria-hidden="true" className="flex shrink-0">
          {leading}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span id={titleId} data-slot="list-title" className="hds-type-ui block truncate">
          {title}
        </span>
        {hasDesc && (
          <span className="flex min-w-0 flex-col">
            {description != null && (
              <span id={`${descId}-d`} data-slot="list-description" className={SLOT.description}>
                {description}
              </span>
            )}
            {meta != null && (
              <span id={`${descId}-m`} data-slot="list-meta" className={SLOT.meta}>
                {meta}
              </span>
            )}
          </span>
        )}
      </span>
      {statusIn === 'trailing' && statusNode && (
        <span id={`${descId}-s`} className={SLOT.status}>
          {statusNode}
        </span>
      )}
      {inner}
    </>
  );

  const a11y = {
    'aria-labelledby': titleId,
    'aria-describedby':
      [
        description != null && `${descId}-d`,
        meta != null && `${descId}-m`,
        typeof trailing === 'number' && actions == null && `${descId}-c`,
        statusIn === 'trailing' && statusNode && `${descId}-s`,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  };

  return (
    <li data-leading={leading != null ? 'true' : undefined} className="flex items-center">
      {typeof props.onSelect === 'function' ? (
        <button
          type="button"
          onClick={props.onSelect}
          className={cn('hds-focus', ROW, className)}
          {...a11y}
        >
          {body}
        </button>
      ) : (
        <LinkComponent to={props.href as string} className={cn(ROW, className)} {...a11y}>
          {body}
        </LinkComponent>
      )}
      {control != null && (
        <span data-slot="list-trailing" className={SLOT.control}>
          {control}
        </span>
      )}
    </li>
  );
}

/**
 * A group: the heading outside the surface, the rows inside it.
 * @usage One titled group of List.Item rows, with a count Badge and an optional action in its heading.
 */
export const ListGroup = /* @__PURE__ */ React.forwardRef<HTMLElement, ListGroupProps>(
  function ListGroup(
    { title, count, action, headingLevel = 2, className, children, ...rest },
    ref,
  ) {
    const { variant, divider } = React.useContext(ListVariantContext);
    const headingId = `${React.useId()}-heading`;
    const rows = listRowsVariants({ variant, divider: variant === 'plain' ? divider : 'inset' });
    return (
      <section
        ref={ref}
        className={cn('flex flex-col gap-[var(--component-list-headingGap)]', className)}
        {...rest}
      >
        <div data-slot="list-group-header" className="flex items-center gap-scale-xs">
          <Text as={`h${headingLevel}`} variant="ui" id={headingId} className="m-0">
            {title}
          </Text>
          {count != null && <Badge count={count} />}
          {action != null && <div className="ml-auto flex items-center">{action}</div>}
        </div>
        {variant === 'inset' ? (
          <Surface as="ul" padding="none" aria-labelledby={headingId} className={rows}>
            {children}
          </Surface>
        ) : (
          <ul aria-labelledby={headingId} className={rows}>
            {children}
          </ul>
        )}
      </section>
    );
  },
);

/**
 * The empty state of a group: an EmptyState in a row.
 * @usage Say that a List.Group has no rows yet, in place of its items.
 */
export function ListEmpty(props: ListEmptyProps) {
  return (
    <li className={SLOT.empty}>
      <EmptyState {...props} />
    </li>
  );
}

type ListComponent = React.ForwardRefExoticComponent<
  ListProps & React.RefAttributes<HTMLDivElement>
> & {
  Group: typeof ListGroup;
  Item: typeof ListItem;
  Empty: typeof ListEmpty;
  Tile: typeof ListTile;
};

const ListRoot = /* @__PURE__ */ React.forwardRef<HTMLDivElement, ListProps>(function List(
  { variant = 'inset', divider = 'inset', defaultStatus, className, children, ...rest },
  ref,
) {
  const ctx = React.useMemo(
    () => ({ variant, divider, defaultStatus }),
    [variant, divider, defaultStatus],
  );
  return (
    <ListVariantContext.Provider value={ctx}>
      <div
        ref={ref}
        data-variant={variant}
        className={cn('flex flex-col gap-[var(--component-list-groupGap)]', className)}
        {...rest}
      >
        {children}
      </div>
    </ListVariantContext.Provider>
  );
});

/** @public */
export const List: ListComponent = /* @__PURE__ */ Object.assign(ListRoot, {
  Group: ListGroup,
  Item: ListItem,
  Empty: ListEmpty,
  Tile: ListTile,
});
