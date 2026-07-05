/**
 * HdsTimeInput stories.
 * @see src/app/components/hds-time-input.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsTimeInput } from '../app/components/hds-time-input';

const meta = {
  title: 'Primitives/hds-time-input',
  component: HdsTimeInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof HdsTimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { 'aria-label': 'Time', defaultValue: '09:30' } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '240px' }}>
      <HdsTimeInput size="sm" aria-label="Small" defaultValue="08:00" />
      <HdsTimeInput size="md" aria-label="Medium" defaultValue="12:30" />
      <HdsTimeInput size="lg" aria-label="Large" defaultValue="18:45" />
    </div>
  ),
};
