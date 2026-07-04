/**
 * StatusDot stories.
 * @see src/app/components/status-dot.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { StatusDot } from '../app/components/status-dot';

const meta = {
  title: 'Primitives/status-dot',
  component: StatusDot,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['neutral', 'info', 'success', 'danger', 'warning', 'inProgress'],
    },
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { tone: 'success', label: 'Online' } };

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {(['neutral', 'info', 'success', 'danger', 'warning', 'inProgress'] as const).map((tone) => (
        <StatusDot key={tone} tone={tone} label={tone} />
      ))}
    </div>
  ),
};

export const WithLabelText: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <StatusDot tone="success" />
      <span>Operational</span>
    </span>
  ),
};
