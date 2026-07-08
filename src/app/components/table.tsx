/**
 * Table - structured data table primitive for documentation and compact UI matrices.
 * @category Display
 * @tier primitive
 */
import { Fragment, useId, type CSSProperties, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
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
        comfortable: 'min-h-[var(--primitive-size-48)] py-[var(--primitive-space-3)]',
        compact: 'min-h-[var(--primitive-size-40)] py-[var(--semantic-space-component-gap)]',
      },
      sticky: {
        true: 'sticky top-0 z-[var(--primitive-zIndex-100)]',
        false: '',
      },
    },
    defaultVariants: { align: 'left', density: 'comfortable', sticky: false },
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
      comfortable: 'min-h-[var(--primitive-size-48)] py-[var(--primitive-space-3)]',
      compact: 'min-h-[var(--primitive-size-40)] py-[var(--semantic-space-component-gap)]',
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

export type TableColumn = {
  key: string;
  label: ReactNode;
  width?: string;
  align?: TableColumnAlign;
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
          className="grid"
          style={{
            minWidth,
            gridTemplateColumns: columns
              .map((column) => column.width ?? 'minmax(0, 1fr)')
              .join(' '),
          }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
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
          ))}
          {rows.map((row, rowIndex) => (
            <Fragment key={row.key ?? rowIndex}>
              {row.cells.map((cell, cellIndex) => (
                <div
                  key={`${row.key ?? rowIndex}-${cellIndex}`}
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
            </Fragment>
          ))}
        </div>
      </Surface>
    </div>
  );
}

/** @internal — CVA variant helpers; compose via Table props instead. */
export { tableHeaderCellVariants, tableDataCellVariants };
