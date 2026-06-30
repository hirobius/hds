/**
 * Progress stories — determinate, indeterminate, and size demos.
 * @see src/app/components/progress.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '../app/components/progress';

const meta = {
  title: 'Primitives/progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: {
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
