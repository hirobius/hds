/**
 * TimeInput stories.
 * @see src/app/components/time-input.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { TimeInput } from '../app/components/time-input';

const meta = {
  title: 'Primitives/time-input',
  component: TimeInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof TimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { 'aria-label': 'Time', defaultValue: '09:30' } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '240px' }}>
      <TimeInput size="sm" aria-label="Small" defaultValue="08:00" />
      <TimeInput size="md" aria-label="Medium" defaultValue="12:30" />
      <TimeInput size="lg" aria-label="Large" defaultValue="18:45" />
    </div>
  ),
};
