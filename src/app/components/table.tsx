/**
 * Table - structured data table primitive for documentation and compact UI matrices.
 * @category Display
 * @tier primitive
 */
import { Fragment, useId, type ReactNode, type CSSProperties } from 'react';
import hds from '../design-system/tokens';
import { Surface } from './surface';

function makeHeaderCellStyle(opts: {
  justifyContent: string;
  textAlign: React.CSSProperties['textAlign'];
  paddingY: string | number;
  minHeight: string | number;
  stickyHeader: boolean;
  zIndex: string | number;
}): React.CSSProperties {
  return {
    ...hds.typeStyles.technical,
    display: 'flex',
    alignItems: 'center',
    justifyContent: opts.justifyContent,
    textAlign: opts.textAlign,
    background: 'var(--semantic-color-surface-overlay)',
    paddingTop: opts.paddingY,
    paddingRight: hds.semantic.space.component.padding,
    paddingBottom: opts.paddingY,
    paddingLeft: hds.semantic.space.component.padding,
    minHeight: opts.minHeight,
    position: opts.stickyHeader ? 'sticky' : undefined,
    top: opts.stickyHeader ? 0 : undefined,
    zIndex: opts.stickyHeader ? opts.zIndex : undefined,
  };
}

function makeDataCellStyle(opts: {
  justifyContent: string;
  minHeight: string | number;
  paddingY: string | number;
  borderBottom: string;
  textAlign: React.CSSProperties['textAlign'];
  slotStyle?: React.CSSProperties;
}): React.CSSProperties {
  return {
    ...opts.slotStyle,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: opts.justifyContent,
    minHeight: opts.minHeight,
    paddingTop: opts.paddingY,
    paddingRight: hds.semantic.space.component.padding,
    paddingBottom: opts.paddingY,
    paddingLeft: hds.semantic.space.component.padding,
    borderBottom: opts.borderBottom,
    textAlign: opts.textAlign,
  };
}

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

function alignToTextAlign(align: TableColumnAlign = 'left') {
  return align;
}

function getDensityMetrics(density: TableDensity) {
  if (density === 'compact') {
    return {
      paddingY: hds.semantic.space.component.gap,
      minHeight: hds.size[40],
    };
  }

  return {
    paddingY: hds.space.px12,
    minHeight: hds.size[48],
  };
}

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
  const metrics = getDensityMetrics(density);
  const captionId = useId();
  const hasCaption = Boolean(caption);

  return (
    <div>
      {caption || description ? (
        <div>
          {caption ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                id={hasCaption ? captionId : undefined}
                style={{
                  ...hds.typeStyles.ui,
                  color: 'var(--semantic-color-content-primary)',
                  margin: 0,
                }}
              >
                {caption}
              </div>
              {captionAction ?? null}
            </div>
          ) : null}
          {description ? (
            <div
              style={{
                ...hds.typeStyles.ui,
                color: 'var(--semantic-color-content-secondary)',
              }}
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
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          background: 'var(--semantic-color-surface-raised)',
        }}
      >
        <div
          style={{
            minWidth,
            ['display']: 'grid',
            gridTemplateColumns: columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' '),
          }}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              style={makeHeaderCellStyle({ justifyContent: cellJustifyContent(column.align), textAlign: alignToTextAlign(column.align), paddingY: metrics.paddingY, minHeight: metrics.minHeight, stickyHeader: Boolean(stickyHeader), zIndex: hds.zIndex.overlay })}
            >
              {column.label}
            </div>
          ))}
          {rows.map((row, rowIndex) => (
            <Fragment key={row.key ?? rowIndex}>
              {row.cells.map((cell, cellIndex) => (
                <div
                  key={`${row.key ?? rowIndex}-${cellIndex}`}
                  style={makeDataCellStyle({ justifyContent: cellJustifyContent(cell.align), minHeight: metrics.minHeight, paddingY: metrics.paddingY, borderBottom: rowIndex < rows.length - 1 ? `${hds.borderWidth.default} solid var(--semantic-color-border-subdued)` : 'none', textAlign: alignToTextAlign(cell.align), slotStyle: SLOT_STYLES[cell.slot] })}
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

