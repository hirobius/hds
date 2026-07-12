/**
 * Badge stories — tone and a11y demos.
 * @see src/app/components/Badge.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../app/components/badge';
import { MODES } from '../../.storybook/preview';

const meta = {
  title: 'Primitives/badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
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
