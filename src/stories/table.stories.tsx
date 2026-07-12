/**
 * Table stories — columns, row slots, density, and caption demos.
 * @see src/app/components/Table.tsx
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Table, type TableColumn, type TableRow } from '../app/components/table';
import { Badge } from '../app/components/badge';
import { MODES } from '../../.storybook/preview';

const meta = {
  title: 'Primitives/table',
  component: Table,
  tags: ['autodocs'],
  parameters: {
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
  { key: 'name', label: 'Token', width: '240px' },
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
