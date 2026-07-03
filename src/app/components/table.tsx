/**
 * Table - structured data table primitive for documentation and compact UI matrices.
 * @category Display
 * @tier primitive
 *
 * Fixed cell chrome (padding, density height, base alignment, header
 * background) lives in the `tableCell` cva. Data-driven styling — grid column
 * template, per-cell horizontal alignment, the last-row border, the sticky
 * header offset, and per-slot typography composites — stays inline because it
 * is computed from props, not a static style axis.
 */
import { Fragment, useId, type ReactNode, type CSSProperties } from 'react';
import { cva } from 'class-variance-authority';
import hds from '../design-system/tokens';
import { Surface } from './surface';

// ── Cell chrome ─────────────────────────────────────────────────────────────
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- semantic/primitive space + color tokens have no Tailwind-theme utility; var()-based so still token-driven
const tableCell = cva('flex box-border px-[var(--semantic-space-component-padding)]', {
  variants: {
    kind: {
      header: 'items-center bg-[var(--semantic-color-surface-overlay)]',
      data: 'items-start',
    },
    density: {
      compact: 'py-[var(--semantic-space-component-gap)] min-h-[var(--primitive-size-40)]',
      comfortable: 'py-[var(--primitive-space-3)] min-h-[var(--primitive-size-48)]',
    },
  },
  defaultVariants: { kind: 'data', density: 'comfortable' },
});

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

// Per-slot typography composites (kept inline — composites, not a static axis).
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

function cellJustifyContent(align: TableColumnAlign = 'left') {
  if (align === 'center') return 'center';
  if (align === 'right') return 'flex-end';
  return 'flex-start';
}

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
                // inline-ok: ui typography composite + token color
                style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)', margin: 0 }}
              >
                {caption}
              </div>
              {captionAction ?? null}
            </div>
          ) : null}
          {description ? (
            <div
              // inline-ok: ui typography composite + token color
              style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
            >
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
        className="overflow-x-auto overflow-y-visible bg-[var(--semantic-color-surface-raised)]"
      >
        <div
          className="grid"
          // inline-ok: grid template + min width are data-driven
          style={{
            minWidth,
            gridTemplateColumns: columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' '),
          }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={tableCell({ kind: 'header', density })}
              // inline-ok: technical typography composite + data-driven alignment/sticky
              style={{
                ...hds.typeStyles.technical,
                justifyContent: cellJustifyContent(column.align),
                textAlign: column.align ?? 'left',
                ...(stickyHeader ? { position: 'sticky', top: 0, zIndex: hds.zIndex.overlay } : {}),
              }}
            >
              {column.label}
            </div>
          ))}
          {rows.map((row, rowIndex) => (
            <Fragment key={row.key ?? rowIndex}>
              {row.cells.map((cell, cellIndex) => (
                <div
                  key={`${row.key ?? rowIndex}-${cellIndex}`}
                  className={tableCell({ kind: 'data', density })}
                  // inline-ok: slot typography composite + data-driven alignment/border
                  style={{
                    ...SLOT_STYLES[cell.slot],
                    justifyContent: cellJustifyContent(cell.align),
                    textAlign: cell.align ?? 'left',
                    borderBottom:
                      rowIndex < rows.length - 1
                        ? `${hds.borderWidth.default} solid var(--semantic-color-border-subdued)`
                        : undefined,
                  }}
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
