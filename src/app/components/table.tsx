/**
 * Table - structured data table primitive for documentation and compact UI matrices.
 * @category Display
 * @tier primitive
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=89-300
 */
import { useId, type CSSProperties, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { Icon } from './icon';
import { Surface } from './surface';

// ── Variants ───────────────────────────────────────────────────────────────────
// `density` is the variant contract's canonical density example (comfortable |
// compact, docs/architecture/variant-contract.md). It drives paddingY + row
// minHeight for both header and data cells. `align` mirrors each column's
// `TableColumnAlign` (left | center | right) and `sticky`/`divider` express the
// header-pin and row-separator states. All four are cva axes bound to Tailwind
// arbitrary-value classes over the same CSS custom properties the previous
// inline styles referenced — same tokens, pixel-parity.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-density paddingY/minHeight + sticky-header offset tokens have no Tailwind-theme utility; var()-based so still token-driven
const tableHeaderCellVariants = cva(
  'flex items-center bg-[var(--semantic-color-surface-overlay)] px-[var(--semantic-space-component-padding)]',
  {
    variants: {
      align: {
        left: 'justify-start text-left',
        center: 'justify-center text-center',
        right: 'justify-end text-right',
      },
      density: {
        comfortable:
          'min-h-[var(--semantic-size-row-comfortable)] py-[var(--semantic-space-component-medium)]',
        compact:
          'min-h-[var(--semantic-size-row-compact)] py-[var(--semantic-space-component-gap)]',
      },
      sticky: {
        true: 'sticky top-0 z-[var(--semantic-zIndex-sticky)]',
        false: '',
      },
    },
    defaultVariants: { align: 'left', density: 'comfortable', sticky: false },
  },
);

// Sortable header cells render a real `<button>` filling the cell so the whole
// header remains one hit target; unstyled beyond layout so the cell's own
// alignment/typography (tableHeaderCellVariants + typeStyles.technical) keeps
// driving pixel parity with the non-sortable render path.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-gap spacing token has no matching Tailwind-theme utility; var()-based so still token-driven
const tableSortButtonVariants = cva(
  'flex w-full cursor-pointer items-center gap-[var(--semantic-space-component-gap)] border-0 bg-transparent p-0 text-inherit [font:inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-density paddingY/minHeight + row-divider border tokens have no Tailwind-theme utility; var()-based so still token-driven
const tableDataCellVariants = cva('flex items-start px-[var(--semantic-space-component-padding)]', {
  variants: {
    align: {
      left: 'justify-start text-left',
      center: 'justify-center text-center',
      right: 'justify-end text-right',
    },
    density: {
      comfortable:
        'min-h-[var(--semantic-size-row-comfortable)] py-[var(--semantic-space-component-medium)]',
      compact: 'min-h-[var(--semantic-size-row-compact)] py-[var(--semantic-space-component-gap)]',
    },
    divider: {
      true: '[border-bottom:var(--semantic-borderWidth-default)_solid_var(--semantic-color-border-subdued)]',
      false: '',
    },
  },
  defaultVariants: { align: 'left', density: 'comfortable', divider: true },
});

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type TableColumnAlign = 'left' | 'center' | 'right';

/** @public */
export type TableSortDirection = 'ascending' | 'descending' | 'none';

export type TableColumn = {
  key: string;
  label: ReactNode;
  width?: string;
  align?: TableColumnAlign;
  /** Renders the header as a button and sets `aria-sort` on the header cell. */
  sortable?: boolean;
  /** Current sort state for this column; defaults to `'none'` when `sortable`. */
  sortDirection?: TableSortDirection;
  /** Called when the sort button is activated (click, Enter, or Space). */
  onSort?: () => void;
};

export type TableCellSlot =
  | 'label'
  | 'value'
  | 'description'
  | 'token'
  | 'code'
  | 'custom'
  | 'icon'
  | 'badge'
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
const SLOT_STYLES: Record<TableCellSlot, CSSProperties> = {
  label: hds.typeStyles.ui,
  value: hds.typeStyles.technical,
  description: {
    ...hds.typeStyles.caption,
    color: 'var(--semantic-color-content-secondary)',
  },
  token: hds.typeStyles.technical,
  code: hds.typeStyles.technical,
  custom: hds.typeStyles.ui,
  icon: hds.typeStyles.caption,
  badge: hds.typeStyles.caption,
  action: hds.typeStyles.ui,
};

export function Table({
  columns,
  rows,
  caption,
  captionAction,
  description,
  minWidth,
  density = 'comfortable',
  flush = false,
  stickyHeader = false,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  caption?: ReactNode;
  /** Optional action rendered to the right of the caption. */
  captionAction?: ReactNode;
  description?: ReactNode;
  minWidth?: number | string;
  density?: TableDensity;
  flush?: boolean;
  stickyHeader?: boolean;
}) {
  const captionId = useId();
  const hasCaption = Boolean(caption);

  return (
    <div>
      {caption || description ? (
        <div>
          {caption ? (
            <div className="flex items-center justify-between">
              <div
                id={hasCaption ? captionId : undefined}
                className="m-0 text-primary"
                style={hds.typeStyles.ui}
              >
                {caption}
              </div>
              {captionAction ?? null}
            </div>
          ) : null}
          {description ? (
            <div className="text-secondary" style={hds.typeStyles.ui}>
              {description}
            </div>
          ) : null}
        </div>
      ) : null}
      <Surface
        padding={flush ? 'none' : 'component'}
        role="region"
        tabIndex={0}
        aria-labelledby={hasCaption ? captionId : undefined}
        aria-label={hasCaption ? undefined : 'Scrollable table content'}
        style={{ overflowX: 'auto', overflowY: 'visible' }}
      >
        <div
          role="table"
          aria-labelledby={hasCaption ? captionId : undefined}
          className="grid"
          style={{
            minWidth,
            gridTemplateColumns: columns
              .map((column) => column.width ?? 'minmax(0, 1fr)')
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
            {columns.map((column) => {
              if (!column.sortable) {
                return (
                  <div
                    key={column.key}
                    role="columnheader"
                    className={cn(
                      tableHeaderCellVariants({
                        align: column.align ?? 'left',
                        density,
                        sticky: Boolean(stickyHeader),
                      }),
                    )}
                    style={hds.typeStyles.technical}
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
                      density,
                      sticky: Boolean(stickyHeader),
                    }),
                  )}
                  style={hds.typeStyles.technical}
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
                  className={cn(
                    tableDataCellVariants({
                      align: cell.align ?? 'left',
                      density,
                      divider: rowIndex < rows.length - 1,
                    }),
                  )}
                  style={SLOT_STYLES[cell.slot]}
                >
                  {cell.content}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

/** @internal — CVA variant helpers; compose via Table props instead. */
export { tableHeaderCellVariants, tableDataCellVariants, tableSortButtonVariants };
