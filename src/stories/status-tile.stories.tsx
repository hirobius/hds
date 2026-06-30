/**
 * StatusTile stories — tone metadata, notes, and trailing slot demos.
 * @see src/app/components/status-tile.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { StatusTile } from '../app/components/status-tile';

const meta = {
  title: 'Primitives/status-tile',
  component: StatusTile,
  tags: ['autodocs'],
  parameters: {
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
    trailing: <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-success)', color: '#fff' }}>Pass</span>,
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Bundle size',
    notes: ['213 kB gzipped', 'Target: 200 kB'],
    trailing: <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-warning)', color: '#fff' }}>Over</span>,
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Snapshot tests',
    notes: ['3 snapshots out of date', 'Blocking merge'],
    trailing: <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-error)', color: '#fff' }}>Fail</span>,
  },
};

export const TileGrid: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'A 2-column grid of status tiles as they appear in a dashboard.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '560px' }}>
      <StatusTile
        tone="success"
        title="Design tokens"
        notes={['Last synced: today']}
        trailing={<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-success)', color: '#fff' }}>Synced</span>}
      />
      <StatusTile
        tone="success"
        title="Accessibility"
        notes={['Score: 98 / 100']}
        trailing={<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-success)', color: '#fff' }}>Pass</span>}
      />
      <StatusTile
        tone="warning"
        title="Bundle size"
        notes={['213 kB gzipped', 'Target: 200 kB']}
        trailing={<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-warning)', color: '#fff' }}>Over</span>}
      />
      <StatusTile
        tone="danger"
        title="Snapshot tests"
        notes={['3 outdated']}
        trailing={<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-error)', color: '#fff' }}>Fail</span>}
      />
    </div>
  ),
};
