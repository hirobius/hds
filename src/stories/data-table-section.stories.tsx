/**
 * DataTableSection stories - a titled table with a toolbar, row actions and an empty state.
 * @see src/app/components/data-table-section.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Pencil } from 'lucide-react';
import { DataTableSection } from '../app/components/data-table-section';
import { Badge } from '../app/components/badge';
import { Button } from '../app/components/button';
import { Icon } from '../app/components/icon';

const columns = [
  { key: 'project', label: 'Project' },
  { key: 'status', label: 'Status' },
  { key: 'due', label: 'Due' },
  { key: 'value', label: 'Value', align: 'right' as const },
];

const rows = [
  {
    key: 'site',
    cells: [
      'Site rebuild',
      <Badge key="s" tone="success">
        Active
      </Badge>,
      'Oct 14',
      '$8,400',
    ],
    actions: (
      <Button
        iconOnly
        label="Edit Site rebuild"
        size="sm"
        variant="tertiary"
        iconLeft={<Icon icon={Pencil} size="small" />}
      />
    ),
  },
  {
    key: 'brand',
    cells: [
      'Brand refresh',
      <Badge key="s" tone="warning">
        Paused
      </Badge>,
      'Nov 2',
      '$3,200',
    ],
    actions: (
      <Button
        iconOnly
        label="Edit Brand refresh"
        size="sm"
        variant="tertiary"
        iconLeft={<Icon icon={Pencil} size="small" />}
      />
    ),
  },
  {
    key: 'retainer',
    cells: [
      'Monthly retainer',
      <Badge key="s" tone="success">
        Active
      </Badge>,
      'Monthly',
      '$3,500',
    ],
    actions: (
      <Button
        iconOnly
        label="Edit Monthly retainer"
        size="sm"
        variant="tertiary"
        iconLeft={<Icon icon={Pencil} size="small" />}
      />
    ),
  },
];

// The story render gate mounts each story from its own args, so every story spreads the base.
const base = {
  title: 'Projects',
  toolbar: <Button variant="primary">Add project</Button>,
  columns,
  rows,
};

const meta = {
  title: 'Patterns/DataTableSection',
  component: DataTableSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A section heading and toolbar over a `Table`. Row actions are consumer-supplied nodes in a trailing column (the pattern bakes in no icon), zero rows shows an `EmptyState`, and the table scrolls horizontally inside the section on narrow widths, so a caller never writes `minWidth`.',
      },
    },
  },
  args: base,
} satisfies Meta<typeof DataTableSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: base };

export const Dark: Story = {
  args: base,
  globals: { theme: 'dark' },
};

export const WithoutRowActions: Story = {
  args: { ...base, rows: rows.map(({ key, cells }) => ({ key, cells })) },
};

export const Empty: Story = {
  args: {
    ...base,
    rows: [],
    emptyTitle: 'No projects yet',
    emptyDescription: 'Add the first one to start tracking work for this client.',
  },
};

export const Phone390: Story = {
  args: base,
  parameters: {
    viewport: {
      viewports: {
        phone390: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
      },
      defaultViewport: 'phone390',
    },
  },
};
