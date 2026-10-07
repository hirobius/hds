/**
 * DataTableSection - a titled table with a toolbar, row actions and an empty state.
 * @category Display
 * @tier pattern
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components-Copy?node-id=2075-268
 */

import * as React from 'react';
import { EmptyState } from './empty-state';
import { Stack } from './stack';
import { Table, type TableColumn, type TableRow } from './table';
import { Text } from './text';

/** @public */
export interface DataTableSectionRow {
  /** Stable row key. */
  key: string;
  /** One node per column, in column order. */
  cells: React.ReactNode[];
  /**
   * Row actions (a `Button` group, a `Menu` trigger, icon-only `Button`s). Rendered in a
   * trailing column; the pattern bakes in no icon.
   */
  actions?: React.ReactNode;
}

/** @public */
export interface DataTableSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Section heading. */
  title: React.ReactNode;
  /** Toolbar beside the heading: a search field, a filter, an "Add" button. */
  toolbar?: React.ReactNode;
  /** Data columns, in order. Do not include the actions column; it is added for you. */
  columns: TableColumn[];
  /** Data rows. An empty array renders the empty state instead of the table. */
  rows: DataTableSectionRow[];
  /** Header of the trailing actions column. Defaults to "Actions". */
  actionsLabel?: string;
  /** Empty-state message when there are no rows. Defaults to "Nothing here yet". */
  emptyTitle?: React.ReactNode;
  /** Optional supporting line under the empty-state message. */
  emptyDescription?: React.ReactNode;
  /** Heading element for the title. Changes the DOM element only. Defaults to 2. */
  level?: 2 | 3 | 4 | 5 | 6;
}

// The table never squeezes a column below this, so a narrow viewport scrolls
// horizontally inside the section instead of crushing its text. Raw rem values
// because the table's grid minWidth is a per-column-count calc with no size token.
const COLUMN_MIN = '8rem';
const ACTIONS_MIN = '6rem';

/**
 * Section heading and toolbar over a `Table`. Row actions are consumer nodes in a
 * trailing column, the table scrolls horizontally on narrow widths without a
 * `minWidth` from the caller, and zero rows shows an `EmptyState`.
 * @screenPattern
 */
export const DataTableSection = /* @__PURE__ */ React.forwardRef<
  HTMLElement,
  DataTableSectionProps
>(function DataTableSection(
  {
    title,
    toolbar,
    columns,
    rows,
    actionsLabel = 'Actions',
    emptyTitle = 'Nothing here yet',
    emptyDescription,
    level = 2,
    ...props
  },
  ref,
) {
  const headingId = React.useId();
  const hasActions = rows.some((row) => row.actions != null);

  const tableColumns: TableColumn[] = hasActions
    ? [...columns, { key: '__actions', label: actionsLabel, align: 'right', width: 'max-content' }]
    : columns;

  const tableRows: TableRow[] = rows.map((row) => ({
    key: row.key,
    cells: [
      ...row.cells.map((content, index) => ({
        slot: 'custom' as const,
        content,
        align: columns[index]?.align,
      })),
      ...(hasActions
        ? [
            {
              slot: 'action' as const,
              align: 'right' as const,
              content: (
                <Stack direction="row" wrap="wrap" gap="tight" align="center" justify="end">
                  {row.actions}
                </Stack>
              ),
            },
          ]
        : []),
    ],
  }));

  const minWidth = `calc(${columns.length} * ${COLUMN_MIN}${hasActions ? ` + ${ACTIONS_MIN}` : ''})`;

  return (
    <section ref={ref} data-hds-component="DataTableSection" aria-labelledby={headingId} {...props}>
      <Stack gap="tight">
        <Stack direction="row" wrap="wrap" gap="normal" align="center" justify="space-between">
          <Text id={headingId} as={`h${level}`} variant="heading3">
            {title}
          </Text>
          {toolbar ? (
            <div data-slot="toolbar" className="ml-auto">
              <Stack direction="row" wrap="wrap" gap="tight" align="center" justify="end">
                {toolbar}
              </Stack>
            </div>
          ) : null}
        </Stack>
        {rows.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <Table
            columns={tableColumns}
            rows={tableRows}
            minWidth={minWidth}
            labelledBy={headingId}
          />
        )}
      </Stack>
    </section>
  );
});
