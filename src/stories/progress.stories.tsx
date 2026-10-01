/**
 * Progress stories — determinate, indeterminate, and size demos.
 * @see src/app/components/progress.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '../app/components/progress';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/Progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Progress'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'Linear progress bar. Determinate when `value` (0–100) is supplied; indeterminate (animated pulse) when `value` is omitted or null.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'radio' },
      options: ['sm', 'md', 'lg'],
    },
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 40,
    size: 'md',
    label: 'Profile completion',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Indeterminate: Story = {
  args: {
    size: 'md',
    label: 'Loading data',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Complete: Story = {
  args: {
    value: 100,
    size: 'md',
    label: 'Upload complete',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export const AllSizes: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All three track sizes at 60% completion.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      <Progress value={60} size="sm" label="Small progress" />
      <Progress value={60} size="md" label="Medium progress" />
      <Progress value={60} size="lg" label="Large progress" />
    </div>
  ),
};

export const Circular: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          '`variant="circular"` draws a ring (hds#393, CircularProgress folds into it): sm 16px, md 24px, lg 32px. `max` sets the scale (here 5 of 12), `tone` colors the fill, and no `value` spins an indeterminate arc.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Progress variant="circular" size="sm" value={5} max={12} label="Small ring" />
        <Progress variant="circular" size="md" value={5} max={12} label="Medium ring" />
        <Progress variant="circular" size="lg" value={5} max={12} label="Large ring" />
        <Progress variant="circular" label="Loading" />
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {(['neutral', 'info', 'success', 'warning', 'danger'] as const).map((tone) => (
          <Progress
            key={tone}
            variant="circular"
            size="lg"
            tone={tone}
            value={9}
            max={12}
            label={`${tone} ring`}
          />
        ))}
      </div>
      <div style={{ width: '320px' }}>
        <Progress tone="danger" value={11} max={12} label="Budget used" />
      </div>
    </div>
  ),
};
