/**
 * StatusTile stories — tone metadata, notes, and trailing slot demos.
 * @see src/app/components/status-tile.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { StatusTile } from '../app/components/status-tile';
import { Badge } from '../app/components/badge';
import { Grid } from '../app/components/grid';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/Status Tile',
  component: StatusTile,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('StatusTile'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'Raised surface tile with title, optional muted notes, and a trailing slot for a badge or affordance. `tone` is carried as metadata for downstream consumers — the tile surface itself is always neutral.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['success', 'warning', 'danger', 'info', 'neutral'],
    },
  },
} satisfies Meta<typeof StatusTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tone: 'neutral',
    title: 'Component coverage',
    notes: ['42 of 48 components documented'],
  },
};

export const WithTrailingBadge: Story = {
  args: {
    tone: 'success',
    title: 'CI pipeline',
    notes: ['All checks passed', 'Last run 4 min ago'],
    trailing: <Badge tone="success">Pass</Badge>,
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Bundle size',
    notes: ['213 kB gzipped', 'Target: 200 kB'],
    trailing: <Badge tone="warning">Over</Badge>,
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Snapshot tests',
    notes: ['3 snapshots out of date', 'Blocking merge'],
    trailing: <Badge tone="danger">Fail</Badge>,
  },
};

export const InGrid: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Status tiles as a dashboard lays them out: `Grid layout="auto-fill"` with `minItemWidth` on the fixed 12px `medium` gap, two columns at this width. TileGrid drew this until 0.20.0 removed it (hds-tile-grid rewrites it).',
      },
    },
  },
  render: () => (
    <Grid layout="auto-fill" minItemWidth="260px" gap="medium" style={{ width: '560px' }}>
      <StatusTile
        tone="success"
        title="Design tokens"
        notes={['Last synced: today']}
        trailing={<Badge tone="success">Synced</Badge>}
      />
      <StatusTile
        tone="success"
        title="Accessibility"
        notes={['Score: 98 / 100']}
        trailing={<Badge tone="success">Pass</Badge>}
      />
      <StatusTile
        tone="warning"
        title="Bundle size"
        notes={['213 kB gzipped', 'Target: 200 kB']}
        trailing={<Badge tone="warning">Over</Badge>}
      />
      <StatusTile
        tone="danger"
        title="Snapshot tests"
        notes={['3 outdated']}
        trailing={<Badge tone="danger">Fail</Badge>}
      />
    </Grid>
  ),
};
