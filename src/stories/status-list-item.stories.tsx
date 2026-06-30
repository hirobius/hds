/**
 * StatusListItem stories — tone and trailing slot demos.
 * @see src/app/components/status-list-item.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { StatusListItem } from '../app/components/status-list-item';

const meta = {
  title: 'Primitives/status-list-item',
  component: StatusListItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Status dot + title row with optional muted notes and a trailing slot (e.g. badge). Tones: success | warning | danger | info | neutral.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['success', 'warning', 'danger', 'info', 'neutral'],
    },
  },
} satisfies Meta<typeof StatusListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tone: 'neutral',
    title: 'Design token audit',
    notes: ['Last run 2 days ago'],
  },
};

export const Success: Story = {
  args: {
    tone: 'success',
    title: 'CI pipeline passed',
    notes: ['All 48 checks green', 'Deployed to staging'],
  },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Accessibility audit',
    notes: ['4 contrast issues found', 'Review before release'],
  },
};

export const Danger: Story = {
  args: {
    tone: 'danger',
    title: 'Build failed',
    notes: ['TypeScript error in avatar.tsx', 'Blocking deployment'],
  },
};

export const Info: Story = {
  args: {
    tone: 'info',
    title: 'New component available',
    notes: ['StatusTile added to primitives', 'See docs for usage'],
  },
};

export const WithTrailing: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All tones with a compact badge in the trailing slot.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '360px' }}>
      <StatusListItem
        tone="success"
        title="Design system audit"
        notes={['Score: 98 / 100']}
        trailing={<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-success)', color: '#fff' }}>Pass</span>}
      />
      <StatusListItem
        tone="warning"
        title="Bundle size check"
        notes={['213 kB gzipped']}
        trailing={<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-warning)', color: '#fff' }}>Warn</span>}
      />
      <StatusListItem
        tone="danger"
        title="Snapshot tests"
        notes={['3 snapshots out of date']}
        trailing={<span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'var(--semantic-color-feedback-error)', color: '#fff' }}>Fail</span>}
      />
      <StatusListItem
        tone="neutral"
        title="Token manifest sync"
        notes={['No changes detected']}
      />
    </div>
  ),
};
