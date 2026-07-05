/**
 * Timestamp stories.
 * @see src/app/components/timestamp.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Timestamp } from '../app/components/timestamp';

const SAMPLE = new Date('2026-07-04T12:00:00.000Z');
const NOW = new Date('2026-07-04T14:30:00.000Z');

const meta = {
  title: 'Primitives/timestamp',
  component: Timestamp,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    format: { control: { type: 'select' }, options: ['date', 'time', 'datetime', 'relative'] },
  },
} satisfies Meta<typeof Timestamp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { date: SAMPLE, format: 'datetime', locale: 'en-US' } };

export const Formats: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Timestamp date={SAMPLE} format="date" locale="en-US" />
      <Timestamp date={SAMPLE} format="time" locale="en-US" />
      <Timestamp date={SAMPLE} format="datetime" locale="en-US" />
      <Timestamp date={SAMPLE} format="relative" locale="en-US" now={NOW} />
    </div>
  ),
};
