/**
 * MetricTiles stories - the default row of headline numbers.
 * @see src/app/components/metric-tiles.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { MetricTile, MetricTiles } from '../app/components/metric-tiles';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Patterns/MetricTiles',
  component: MetricTiles,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('MetricTiles'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'One canonical metric tile at one fixed min-height (value `heading2`, eyebrow label, caption sub line). The row has min(tiles, 4) columns, so it never leaves an empty column. Use `Stat` for an inline number in prose or a dense list, `Card.Metric` only inside an existing `Card`, and `StatusTile` for state with notes, never a number.',
      },
    },
  },
} satisfies Meta<typeof MetricTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeTiles: Story = {
  args: {
    children: [
      <MetricTile key="a" label="Retainer" value="$3,500" sub="Active" tone="success" />,
      <MetricTile key="b" label="Open tasks" value="12" sub="this week" />,
      <MetricTile key="c" label="Overdue" value="3" sub="needs a reply" tone="danger" />,
    ],
  },
};

export const FourTiles: Story = {
  args: {
    children: [
      <MetricTile key="a" label="Leads" value="48" />,
      <MetricTile key="b" label="Sites live" value="9" tone="success" />,
      <MetricTile key="c" label="In review" value="4" tone="warning" />,
      <MetricTile key="d" label="Invoiced" value="$12,400" tone="info" sub="this quarter" />,
    ],
  },
};

export const SubLineOptional: Story = {
  args: {
    children: [
      <MetricTile key="a" label="With a sub line" value="24" sub="last 30 days" />,
      <MetricTile key="b" label="Without one" value="24" />,
    ],
  },
};

export const Tones: Story = {
  args: {
    children: [
      <MetricTile key="a" label="Neutral" value="1" tone="neutral" />,
      <MetricTile key="b" label="Success" value="2" tone="success" />,
      <MetricTile key="c" label="Warning" value="3" tone="warning" />,
      <MetricTile key="d" label="Danger" value="4" tone="danger" />,
    ],
  },
};
