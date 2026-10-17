/**
 * Table - structured data table primitive for documentation and compact UI matrices.
 * @category Display
 * @tier primitive
 * @usage Show rows of structured data in aligned columns, with optional sorting.
 * @whenNot A single record, a short list of links, or content that reflows as cards.
 * @useInstead Field one record as label and value pairs
 * @useInstead Stack a short list of items
 * @a11y component required a11y:table.table-role The grid is exposed as a table with column headers.
 * @a11y component required a11y:table.aria-sort A sortable column header reports aria-sort none, ascending or descending.
 * @a11y component required a11y:table.sorted-header A screen reader reads the sorted column header with its sort direction.
 * @a11y component required a11y:table.sort-button-named The sort control is a button named by the column label.
 * @a11y component required a11y:table.sort-keyboard The sort button activates with Enter and Space.
 * @a11y component required a11y:table.scroll-region-focusable The scroll region is a named tab stop so keyboard users can scroll it (1.4.10).
 * @a11y consumer required Name the table with a caption or aria-labelledby when more than one is on the screen.
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=89-300
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cva } from 'class-variance-authority';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { Icon } from './icon';
import { Surface } from './surface';
import {
  measureScrollEdges,
  scrollEdgeFadeStyle,
  type ScrollEdgeOverflow,
} from './scroll-edge-fade';

// ── Variants ───────────────────────────────────────────────────────────────────
// `density` is the variant contract's canonical density example (comfortable |
// compact, docs/architecture/variant-contract.md). It drives paddingY + row
// minHeight for both header and data cells. `align` mirrors each column's
// `TableColumnAlign` (left | center | right) and `sticky`/`divider` express the
// header-pin and row-separator states. All four are cva axes bound to Tailwind
// arbitrary-value classes over the same CSS custom properties the previous
// inline styles referenced — same tokens, pixel-parity.
// A column without its own `width` never narrows below one tile (size.tile) per cell,
// so a wrapping link still reads in lines, not letters, on a phone; past that the
// frame scrolls. A column with an explicit `width` is sized by that track alone.
const COLUMN_FLOOR = { true: 'min-w-[var(--semantic-size-tile)]', false: '' } as const;

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-density paddingY/minHeight + sticky-header offset tokens have no Tailwind-theme utility; var()-based so still token-driven
const tableHeaderCellVariants = /* @__PURE__ */ cva(
  'flex items-center bg-[var(--semantic-color-surface-raised)] px-[var(--semantic-space-surface-padding)] [border-bottom:var(--semantic-borderWidth-default)_solid_var(--semantic-color-border-subdued)] break-words',
  {
    variants: {
      align: {
        left: 'justify-start text-left',
        center: 'justify-center text-center',
        right: 'justify-end text-right',
      },
      density: {
        follow:
          'min-h-[var(--semantic-size-row-comfortable)] py-[var(--semantic-space-component-medium)] [[data-density=compact]_&]:min-h-[var(--semantic-size-row-compact)] [[data-density=compact]_&]:py-[var(--semantic-space-scale-xs)]',
        comfortable:
          'min-h-[var(--semantic-size-row-comfortable)] py-[var(--semantic-space-component-medium)]',
        compact: 'min-h-[var(--semantic-size-row-compact)] py-[var(--semantic-space-scale-xs)]',
      },
      sticky: {
        true: 'sticky top-0 z-[var(--semantic-zIndex-sticky)]',
        false: '',
      },
      // The column rules run up through the header band so each column reads as one strip.
      columnDivider: {
        true: 'border-l border-[color:var(--semantic-color-border-subdued)]',
        false: '',
      },
      floor: COLUMN_FLOOR,
    },
    defaultVariants: { align: 'left', sticky: false, columnDivider: false, floor: true },
  },
);

// Sortable header cells render a real `<button>` filling the cell so the whole
// header remains one hit target; unstyled at rest beyond layout so the cell's own
// alignment/typography (tableHeaderCellVariants + typeStyles.caption) keeps
// driving pixel parity with the non-sortable render path. On hover the label and
// glyph ease to the muted foreground over the productive motion token (zeroed
// under prefers-reduced-motion): a colour change, not a wash, because the button
// carries no padding for a fill and the header already rests at full contrast.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-gap spacing and productive-motion duration/easing tokens have no matching Tailwind-theme utility; var()-based so still token-driven
const tableSortButtonVariants = /* @__PURE__ */ cva(
  'flex w-full cursor-pointer items-center gap-[var(--semantic-space-scale-xs)] border-0 bg-transparent p-0 text-inherit [font:inherit] transition-colors duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)] hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      align: {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
      },
    },
    defaultVariants: { align: 'left' },
  },
);

// Body rows breathe more than the header (scale.sm, 16px, where the header keeps
// component.medium) and carry thin rules both ways: `divider` under every row but the
// last, `columnDivider` before every cell but the first. No zebra fill.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-density paddingY/minHeight + row/column divider border tokens have no Tailwind-theme utility; var()-based so still token-driven
const tableDataCellVariants = /* @__PURE__ */ cva(
  // items-center (not items-start) so mixed cell content lines up on a shared
  // vertical center — a badge/status slot no longer floats above its text
  // siblings in the same row. Matches the header cell's items-center.
  'flex items-center px-[var(--semantic-space-surface-padding)]',
  {
    variants: {
      align: {
        left: 'justify-start text-left',
        center: 'justify-center text-center',
        right: 'justify-end text-right',
      },
      density: {
        follow:
          'min-h-[var(--semantic-size-row-comfortable)] py-[var(--semantic-space-scale-sm)] [[data-density=compact]_&]:min-h-[var(--semantic-size-row-compact)] [[data-density=compact]_&]:py-[var(--semantic-space-scale-xs)]',
        comfortable:
          'min-h-[var(--semantic-size-row-comfortable)] py-[var(--semantic-space-scale-sm)]',
        compact: 'min-h-[var(--semantic-size-row-compact)] py-[var(--semantic-space-scale-xs)]',
      },
      divider: {
        true: '[border-bottom:var(--semantic-borderWidth-default)_solid_var(--semantic-color-border-subdued)]',
        false: '',
      },
      columnDivider: {
        true: 'border-l border-[color:var(--semantic-color-border-subdued)]',
        false: '',
      },
      // Text wraps between words and keeps every word whole, so a column is never
      // narrower than its longest word and the frame scrolls before a word splits.
      // An action cell (a bare link, a URL) may break anywhere, so a long link wraps
      // inside its column instead of pushing the table wide. A literal (value or token
      // slot: a date, a number, a token name) never wraps: `2026-10-05` split at its
      // hyphens reads as two values, so its column holds the whole literal.
      wrap: {
        words: 'break-words',
        anywhere: '[overflow-wrap:anywhere]',
        none: 'whitespace-nowrap',
      },
      floor: COLUMN_FLOOR,
    },
    defaultVariants: {
      align: 'left',
      divider: true,
      columnDivider: false,
      wrap: 'words',
      floor: true,
    },
  },
);

// The frame (a Surface with no fill) owns the border and the rounded corners; the
// scroll region inside it owns the scrolling, so the edge fade never fades the border.
const tableFrameClass =
  'bg-transparent border border-solid border-[color:var(--semantic-color-border-subdued)]';

// `relative` makes the region the containing block for absolutely positioned content
// (a link's `sr-only` label): without it that content escapes the scroller and widens
// the page when a column runs past the frame.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- surface-padding token has no Tailwind-theme utility; var()-based so still token-driven
const tableRegionVariants = /* @__PURE__ */ cva(
  'relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
  {
    variants: {
      flush: {
        true: 'p-0',
        false: 'p-[var(--semantic-space-surface-padding)]',
      },
    },
    defaultVariants: { flush: true },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type TableColumnAlign = 'left' | 'center' | 'right';

/** @public */
export type TableSortDirection = 'ascending' | 'descending' | 'none';

/**
 * A column's grid track: a sizing keyword, a fraction, a `minmax()` track or a
 * token variable. Raw `px` / `rem` widths are type errors; size from tokens.
 * @public
 */
export type TableColumnWidth =
  | 'auto'
  | 'min-content'
  | 'max-content'
  | `${number}fr`
  | `minmax(${string})`
  | `var(--${string})`;

export type TableColumn = {
  key: string;
  label: ReactNode;
  /**
   * Grid track for this column; defaults to `minmax(min-content, 1fr)`, so a column
   * never squeezes below its content (prose wraps, literals and controls hold).
   * Give a column of literals (dates, bare URLs) `max-content` so it sizes to them and
   * the prose columns take the spare width.
   */
  width?: TableColumnWidth;
  align?: TableColumnAlign;
  /** Renders the header as a button and sets `aria-sort` on the header cell. */
  sortable?: boolean;
  /** Current sort state for this column; defaults to `'none'` when `sortable`. */
  sortDirection?: TableSortDirection;
  /** Called when the sort button is activated (click, Enter, or Space). */
  onSort?: () => void;
};

export type TableCellSlot =
  /** UI text: the row label. */
  | 'label'
  /** Renders in monospace: a literal value. */
  | 'value'
  /** Secondary-colour caption text explaining the row. */
  | 'description'
  /** Renders in monospace: a token name. */
  | 'token'
  /** Renders in monospace: a code snippet. */
  | 'code'
  /** UI text: arbitrary content you supply. */
  | 'custom'
  /** Caption-size text: an icon or glyph. */
  | 'icon'
  /** Caption-size text: a status badge. */
  | 'badge'
  /** UI text: a button or link. */
  | 'action';

export type TableCell = {
  slot: TableCellSlot;
  content: ReactNode;
  align?: TableColumnAlign;
  colSpan?: number;
  rowSpan?: number;
};

export type TableRow = {
  key?: string;
  cells: TableCell[];
};

type TableDensity = 'compact' | 'comfortable';

// Per-slot typography. Kept as CSSProperties (not Tailwind classes) — the
// composite semantic.typography.* tokens (fontFamily/size/weight/letterSpacing/
// lineHeight) aren't yet bridged to Tailwind theme utilities anywhere in HDS
// (see Text primitive, src/app/components/text.tsx), so this mirrors the
// established `style={hds.typeStyles.X}` pattern used by already-converted
// cva components like Breadcrumb.
// Body text is the ui size at the regular weight, so the medium-weight header and an
// emphasised first column read as the stronger voices.
const BODY_TEXT: CSSProperties = {
  ...hds.typeStyles.ui,
  fontWeight: 'var(--semantic-typography-body-font-weight)',
};
const HEADER_TEXT: CSSProperties = hds.typeStyles.ui;
const EMPHASIS: CSSProperties = { fontWeight: 'var(--semantic-typography-ui-font-weight)' };

// Slots whose content is one literal value: kept on one line (see `wrap` above).
const LITERAL_SLOTS: ReadonlySet<TableCellSlot> = new Set(['value', 'token']);

const SLOT_STYLES: Record<TableCellSlot, CSSProperties> = {
  label: BODY_TEXT,
  value: BODY_TEXT,
  description: {
    ...hds.typeStyles.caption,
    color: 'var(--semantic-color-content-secondary)',
  },
  token: hds.typeStyles.mono,
  code: hds.typeStyles.mono,
  custom: BODY_TEXT,
  icon: hds.typeStyles.caption,
  badge: hds.typeStyles.caption,
  action: BODY_TEXT,
};

export function Table({
  columns,
  rows,
  caption,
  captionAction,
  description,
  labelledBy,
  minWidth,
  density,
  flush = true,
  stickyHeader = false,
  emphasizeFirstColumn = false,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  caption?: ReactNode;
  /** Optional action rendered to the right of the caption. */
  captionAction?: ReactNode;
  description?: ReactNode;
  /**
   * Id of an element that names the table when there is no `caption`. Applied to
   * the `role="table"` element, and to the scroll region together with its own
   * label so two tables on one screen keep distinct region names.
   */
  labelledBy?: string;
  minWidth?: number | string;
  /**
   * Row density. Omit it to follow the ancestor `data-density` dial (comfortable by
   * default, compact inside `[data-density="compact"]`); pass a value to fix it.
   */
  density?: TableDensity;
  /**
   * Drop the scroll region's own inset. On by default: every cell already carries the
   * surface inset, so a padded region doubled it (48px at the edges, hds#522). Pass
   * `flush={false}` to restore the extra region padding.
   */
  flush?: boolean;
  stickyHeader?: boolean;
  /** Set the first column's body cells in the medium weight, for a row-label column. */
  emphasizeFirstColumn?: boolean;
}) {
  const captionId = useId();
  const regionId = useId();
  const hasCaption = Boolean(caption);
  const nameId = hasCaption ? captionId : labelledBy;
  const regionRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState<ScrollEdgeOverflow>(undefined);

  const updateOverflow = useCallback(() => {
    if (regionRef.current) setOverflow(measureScrollEdges(regionRef.current));
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = regionRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [updateOverflow]);

  return (
    <div className="min-w-0 max-w-full">
      {caption || description ? (
        // inline-ok: token-driven gap so the caption/description block doesn't
        // touch the table's header band below it.
        <div style={{ marginBottom: hds.semantic.space.scale.sm }}>
          {caption ? (
            <div className="flex items-center justify-between">
              <div
                id={hasCaption ? captionId : undefined}
                className="m-0 text-foreground"
                style={hds.typeStyles.ui}
              >
                {caption}
              </div>
              {captionAction ?? null}
            </div>
          ) : null}
          {description ? (
            <div className="text-muted-foreground" style={hds.typeStyles.ui}>
              {description}
            </div>
          ) : null}
        </div>
      ) : null}
      <Surface padding="none" overflow="hidden" className={tableFrameClass}>
        <div
          ref={regionRef}
          id={regionId}
          role="region"
          // a11y:table.scroll-region-focusable: a named region keyboard users can scroll (1.4.10).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-labelledby={
            hasCaption ? captionId : labelledBy ? `${labelledBy} ${regionId}` : undefined
          }
          aria-label={hasCaption ? undefined : 'Scrollable table content'}
          data-overflow={overflow}
          onScroll={updateOverflow}
          className={tableRegionVariants({ flush })}
          style={{ overflowX: 'auto', overflowY: 'visible', ...scrollEdgeFadeStyle(overflow) }}
        >
          <div
            role="table"
            aria-labelledby={nameId}
            className="grid"
            style={{
              minWidth,
              // min-content floor, not 0: a `minmax(0, 1fr)` track let a link or a
              // button row spill out of its cell and past the frame, where nothing
              // could scroll to it (the desktop "sheared table" bug).
              gridTemplateColumns: columns
                .map((column) => column.width ?? 'minmax(min-content, 1fr)')
                .join(' '),
            }}
          >
            {/*
             * `display: contents` keeps this wrapper out of the CSS Grid layout
             * entirely — its children still lay out as direct grid items,
             * pixel-identical to before — while giving ARIA a real row to hang
             * columnheader/cell roles from. Without it, `role="columnheader"`
             * on a header cell is an orphan (no row → no table ancestor chain),
             * which axe flags as aria-required-parent (critical).
             */}
            <div role="row" style={{ display: 'contents' }}>
              {columns.map((column, columnIndex) => {
                if (!column.sortable) {
                  return (
                    <div
                      key={column.key}
                      role="columnheader"
                      className={cn(
                        tableHeaderCellVariants({
                          align: column.align ?? 'left',
                          density: density ?? 'follow',
                          sticky: Boolean(stickyHeader),
                          columnDivider: columnIndex > 0,
                          floor: !column.width,
                        }),
                      )}
                      style={HEADER_TEXT}
                    >
                      {column.label}
                    </div>
                  );
                }

                const direction = column.sortDirection ?? 'none';
                const DirectionIcon =
                  direction === 'ascending'
                    ? ArrowUp
                    : direction === 'descending'
                      ? ArrowDown
                      : ArrowUpDown;

                return (
                  <div
                    key={column.key}
                    role="columnheader"
                    aria-sort={direction}
                    className={cn(
                      tableHeaderCellVariants({
                        align: column.align ?? 'left',
                        density: density ?? 'follow',
                        sticky: Boolean(stickyHeader),
                        columnDivider: columnIndex > 0,
                        floor: !column.width,
                      }),
                    )}
                    style={HEADER_TEXT}
                  >
                    <button
                      type="button"
                      onClick={column.onSort}
                      className={cn(tableSortButtonVariants({ align: column.align ?? 'left' }))}
                    >
                      {column.label}
                      <Icon icon={DirectionIcon} size="small" aria-hidden />
                    </button>
                  </div>
                );
              })}
            </div>
            {rows.map((row, rowIndex) => (
              <div key={row.key ?? rowIndex} role="row" style={{ display: 'contents' }}>
                {row.cells.map((cell, cellIndex) => (
                  <div
                    key={`${row.key ?? rowIndex}-${cellIndex}`}
                    role="cell"
                    data-slot={cell.slot}
                    className={cn(
                      tableDataCellVariants({
                        align: cell.align ?? 'left',
                        density: density ?? 'follow',
                        divider: rowIndex < rows.length - 1,
                        columnDivider: cellIndex > 0,
                        wrap: LITERAL_SLOTS.has(cell.slot)
                          ? 'none'
                          : cell.slot === 'action'
                            ? 'anywhere'
                            : 'words',
                        floor: !columns[cellIndex]?.width,
                      }),
                    )}
                    style={
                      emphasizeFirstColumn && cellIndex === 0
                        ? { ...SLOT_STYLES[cell.slot], ...EMPHASIS }
                        : SLOT_STYLES[cell.slot]
                    }
                  >
                    {cell.content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Surface>
    </div>
  );
}
