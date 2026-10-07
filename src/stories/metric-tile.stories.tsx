/**
 * MetricTile stories - one headline number, one tone at a time.
 * @see src/app/components/metric-tiles.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { MetricTile } from '../app/components/metric-tiles';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Patterns/MetricTile',
  component: MetricTile,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('MetricTile'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'One metric tile: eyebrow label, `heading2` value and caption sub line on a raised surface at one fixed min-height. `tone` colours the value only. For a row of tiles use `MetricTiles`.',
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: 'select' },
      options: ['neutral', 'success', 'warning', 'danger', 'info'],
    },
  },
} satisfies Meta<typeof MetricTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Open tasks', value: '12', sub: 'Across 4 projects' },
};

export const Danger: Story = {
  args: { label: 'Overdue', value: '2', sub: 'Needs follow-up', tone: 'danger' },
};
