/**
 * Skeleton stories — variants.
 * @see src/app/components/skeleton.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from '../app/components/skeleton';

const meta = {
  title: 'Primitives/skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Decorative loading placeholder (aria-hidden) with a shimmer. Variants: text | rectangular | circular. Dimensions are caller-supplied.',
      },
    },
  },
  argTypes: {
    variant: { control: { type: 'radio' }, options: ['text', 'rectangular', 'circular'] },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rectangular: Story = { args: { variant: 'rectangular', width: 280, height: 120 } };

export const Composite: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: 320 }}>
      <Skeleton variant="circular" width={48} height={48} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
  ),
};
