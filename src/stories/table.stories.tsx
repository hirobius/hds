/**
 * Table stories — columns, row slots, density, and caption demos.
 * @see src/app/components/Table.tsx
 */
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  type TableColumn,
  type TableRow,
  type TableSortDirection,
} from '../app/components/table';
import { Badge } from '../app/components/badge';
import { MODES } from '../../.storybook/preview';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/table',
  component: Table,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Table'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'Structured data table primitive for documentation and compact UI matrices. Accepts typed columns and rows with named cell slots (label | value | description | token | code | badge | icon | action | custom). Density: compact | comfortable.',
      },
    },
  },
  argTypes: {
    density: {
      control: { type: 'radio' },
      options: ['comfortable', 'compact'],
    },
    flush: { control: 'boolean' },
    stickyHeader: { control: 'boolean' },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Token table ──────────────────────────────────────────────────────────────

const tokenColumns: TableColumn[] = [
  { key: 'name', label: 'Token', width: 'max-content' },
  { key: 'value', label: 'Value' },
  { key: 'description', label: 'Description' },
];

const tokenRows: TableRow[] = [
  {
    key: 'bg-default',
    cells: [
      { slot: 'token', content: 'semantic.color.bg.default' },
      { slot: 'value', content: '#ffffff' },
      { slot: 'description', content: 'Page background for light theme' },
    ],
  },
  {
    key: 'content-primary',
    cells: [
      { slot: 'token', content: 'semantic.color.content.primary' },
      { slot: 'value', content: '#111111' },
      { slot: 'description', content: 'Primary text on all surfaces' },
    ],
  },
  {
    key: 'border-default',
    cells: [
      { slot: 'token', content: 'semantic.color.border.default' },
      { slot: 'value', content: '#e5e5e5' },
      { slot: 'description', content: 'Standard divider and card border' },
    ],
  },
];

export const Default: Story = {
  render: () => <Table columns={tokenColumns} rows={tokenRows} />,
  parameters: {
    // #126 — representative story for the per-brand/density/theme modes matrix.
    chromatic: { modes: MODES },
  },
};

export const WithCaption: Story = {
  parameters: {
    docs: {
      description: { story: 'Optional caption + captionAction for titled data tables.' },
    },
  },
  render: () => (
    <Table
      columns={tokenColumns}
      rows={tokenRows}
      caption="Semantic color tokens"
      description="Token values shown for light theme defaults."
    />
  ),
};

// ── Component inventory table (badge slots) ──────────────────────────────────

const componentColumns: TableColumn[] = [
  { key: 'name', label: 'Component' },
  { key: 'status', label: 'Status', width: '120px', align: 'center' },
  { key: 'tier', label: 'Tier', width: '100px' },
];

const componentRows: TableRow[] = [
  {
    key: 'hds-button',
    cells: [
      { slot: 'label', content: 'Button' },
      { slot: 'badge', content: <Badge tone="success">Done</Badge> },
      { slot: 'label', content: 'primitive' },
    ],
  },
  {
    key: 'hds-badge',
    cells: [
      { slot: 'label', content: 'Badge' },
      { slot: 'badge', content: <Badge tone="success">Done</Badge> },
      { slot: 'label', content: 'primitive' },
    ],
  },
  {
    key: 'hds-dialog',
    cells: [
      { slot: 'label', content: 'Dialog' },
      { slot: 'badge', content: <Badge tone="info">In Progress</Badge> },
      { slot: 'label', content: 'pattern' },
    ],
  },
];

export const WithBadgeSlots: Story = {
  parameters: {
    docs: {
      description: { story: 'badge slot renders inline badge content (e.g. Badge) in cells.' },
    },
  },
  render: () => <Table columns={componentColumns} rows={componentRows} />,
};

// ── Density ──────────────────────────────────────────────────────────────────

export const DensityCompact: Story = {
  parameters: {
    docs: { description: { story: 'compact density — reduced row height for data-dense views.' } },
  },
  render: () => <Table columns={tokenColumns} rows={tokenRows} density="compact" />,
};

export const DensityComfortable: Story = {
  parameters: {
    docs: {
      description: { story: 'comfortable density — default row height for readable tables.' },
    },
  },
  render: () => <Table columns={tokenColumns} rows={tokenRows} density="comfortable" />,
};

// ── Flush ────────────────────────────────────────────────────────────────────

// ── Sortable ─────────────────────────────────────────────────────────────────

function SortableExample() {
  const [sort, setSort] = useState<{ key: string; direction: TableSortDirection }>({
    key: 'name',
    direction: 'ascending',
  });

  const sortedRows = [...tokenRows].sort((a, b) => {
    const index = sort.key === 'name' ? 0 : sort.key === 'value' ? 1 : 2;
    const aValue = String(a.cells[index]?.content ?? '');
    const bValue = String(b.cells[index]?.content ?? '');
    const cmp = aValue.localeCompare(bValue);
    return sort.direction === 'descending' ? -cmp : cmp;
  });

  const columns: TableColumn[] = tokenColumns.map((column) => ({
    ...column,
    sortable: true,
    sortDirection: sort.key === column.key ? sort.direction : 'none',
    onSort: () =>
      setSort((current) => ({
        key: column.key,
        direction:
          current.key === column.key && current.direction === 'ascending'
            ? 'descending'
            : 'ascending',
      })),
  }));

  return <Table columns={columns} rows={sortedRows} />;
}

export const Sortable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'sortable columns render a button in the header cell, set aria-sort on the header, and show a direction glyph from tokens. Click a header to toggle ascending/descending.',
      },
    },
  },
  render: () => <SortableExample />,
};

export const Flush: Story = {
  parameters: {
    docs: {
      description: {
        story: 'flush=true removes outer horizontal padding for edge-to-edge tables.',
      },
    },
  },
  render: () => <Table columns={tokenColumns} rows={tokenRows} flush />,
};
