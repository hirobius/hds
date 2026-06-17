/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
// @doc-exempt: internal HDS documentation utility that shapes generated prop rows for Table
import type { ReactNode } from 'react';
import hds from '../design-system/tokens';
import type { TableColumn, TableRow } from './table';

export type ComponentPropRow = {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
};

export const PROP_TABLE_COLUMNS: TableColumn[] = [
  { key: 'prop', label: 'Prop', width: '24%' },
  { key: 'type', label: 'Type', width: '28%' },
  { key: 'default', label: 'Default', width: '20%' },
  { key: 'description', label: 'Description', width: '28%' },
];

function propNameCell(row: ComponentPropRow): ReactNode {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: hds.semantic.space.subgrid.xs }}>
      <span>{row.name}</span>
      {row.required ? <span style={{ color: 'var(--semantic-color-content-accent)' }}>*</span> : null}
    </span>
  );
}

export function buildPropTableRows(rows: ComponentPropRow[]): TableRow[] {
  return rows.map((row) => ({
    key: row.name,
    cells: [
      { slot: 'token', content: propNameCell(row) },
      { slot: 'code', content: row.type },
      { slot: 'code', content: row.default ?? '—' },
      { slot: 'description', content: row.description },
    ],
  }));
}
