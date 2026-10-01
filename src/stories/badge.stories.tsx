/**
 * Badge stories — tone and a11y demos.
 * @see src/app/components/Badge.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../app/components/badge';
import { MODES } from '../../.storybook/preview';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Badge'),
    layout: 'centered',
    docs: {
      description: {
        component:
          'Compact feedback badge for neutral and semantic states. Tones: neutral | info | success | danger | warning.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['neutral', 'info', 'success', 'danger', 'warning'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  args: { tone: 'neutral', children: 'Neutral' },
};

export const Info: Story = {
  args: { tone: 'info', children: 'Info' },
};

export const Success: Story = {
  args: { tone: 'success', children: 'Success' },
};

export const Danger: Story = {
  args: { tone: 'danger', children: 'Danger' },
};

export const Warning: Story = {
  args: { tone: 'warning', children: 'Warning' },
};

export const AllTones: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All five tones rendered side-by-side.',
      },
    },
    // #126 — representative story for the per-brand/density/theme modes matrix.
    chromatic: { modes: MODES },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="info">Info</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="danger">Danger</Badge>
      <Badge tone="warning">Warning</Badge>
    </div>
  ),
};

export const Dot: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          '`dot` renders a solid status dot with no text (hds#393). `tone` still picks the color and `size` is sm | md | lg. With `label` the dot is a role="status" named by it; without one it is aria-hidden and the text beside it carries the meaning.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Badge dot tone="neutral" label="Idle" />
        <Badge dot tone="info" label="Syncing" />
        <Badge dot tone="success" label="Online" />
        <Badge dot tone="warning" label="Degraded" />
        <Badge dot tone="danger" label="Offline" />
        <Badge dot tone="inProgress" label="Deploying" />
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Badge dot size="sm" tone="success" label="Online, small" />
        <Badge dot size="md" tone="success" label="Online, medium" />
        <Badge dot size="lg" tone="success" label="Online, large" />
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
        <Badge dot tone="success" />
        <span>Online (the dot is decorative here)</span>
      </div>
    </div>
  ),
};
