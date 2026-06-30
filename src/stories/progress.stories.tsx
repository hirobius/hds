/**
 * Progress stories — determinate + indeterminate.
 * @see src/app/components/progress.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '../app/components/progress';

const meta = {
  title: 'Primitives/progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Linear progress bar. Determinate when `value` is a number (0–100), indeterminate when null. role="progressbar" with aria-value*.',
      },
    },
  },
  argTypes: {
    size: { control: { type: 'radio' }, options: ['sm', 'md', 'lg'] },
    value: { control: { type: 'range', min: 0, max: 100 } },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
  args: { value: 60 },
  render: (args) => (
    <div style={{ width: 320 }}>
      <Progress {...args} />
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Progress value={null} />
    </div>
  ),
};
