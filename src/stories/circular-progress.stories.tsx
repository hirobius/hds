/**
 * CircularProgress stories.
 * @see src/app/components/circular-progress.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CircularProgress } from '../app/components/circular-progress';

const meta = {
  title: 'Primitives/circular-progress',
  component: CircularProgress,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
    value: { control: { type: 'range', min: 0, max: 100 } },
  },
} satisfies Meta<typeof CircularProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { value: 65, label: 'Progress', size: 'md' } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <CircularProgress value={65} size="sm" label="Progress" />
      <CircularProgress value={65} size="md" label="Progress" />
      <CircularProgress value={65} size="lg" label="Progress" />
    </div>
  ),
};

export const Indeterminate: Story = {
  args: { indeterminate: true, label: 'Loading', size: 'md' },
};
