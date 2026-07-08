/**
 * Stat stories — tone and sub-line demos.
 * @see src/app/components/stat.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Stat } from '../app/components/stat';

const meta = {
  title: 'Primitives/stat',
  component: Stat,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Headline metric tile: large value, uppercase caption label, and an optional muted sub-line. Tones: neutral | success | warning | danger | info.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['neutral', 'success', 'warning', 'danger', 'info'],
    },
  },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Components shipped',
    value: '42',
    tone: 'neutral',
  },
};

export const WithSub: Story = {
  args: {
    label: 'Applications sent',
    value: '18',
    sub: '+3 this week',
    tone: 'neutral',
  },
};

export const Success: Story = {
  args: {
    label: 'Offer rate',
    value: '94%',
    sub: 'Above industry avg',
    tone: 'success',
  },
};

export const Warning: Story = {
  args: {
    label: 'Open reviews',
    value: '7',
    sub: '2 past due',
    tone: 'warning',
  },
};

export const Danger: Story = {
  args: {
    label: 'Build failures',
    value: '3',
    sub: 'Last 24 hours',
    tone: 'danger',
  },
};

export const AllTones: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All five tones rendered side-by-side.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Stat label="Components" value="42" tone="neutral" />
      <Stat label="Offer rate" value="94%" tone="success" sub="Above avg" />
      <Stat label="Open reviews" value="7" tone="warning" sub="2 past due" />
      <Stat label="Failures" value="3" tone="danger" sub="Last 24h" />
      <Stat label="In review" value="5" tone="info" sub="Awaiting signoff" />
    </div>
  ),
};
