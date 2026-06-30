/**
 * Skeleton stories — variant and composition demos.
 * @see src/app/components/skeleton.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from '../app/components/skeleton';

const meta = {
  title: 'Primitives/skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Decorative loading placeholder with shimmer animation. Variants: rectangular | text | circular. Dimensions are caller-supplied via `width` and `height`.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['rectangular', 'text', 'circular'],
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'rectangular',
    width: 240,
    height: 48,
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    width: 200,
  },
};

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 40,
    height: 40,
  },
};

export const CardPlaceholder: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Composed skeleton mimicking a card with avatar, title, and body text.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '320px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Skeleton variant="circular" width={40} height={40} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" width="100%" height={120} />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="75%" />
    </div>
  ),
};

export const AllVariants: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All three variants side-by-side.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Skeleton variant="text" width={160} />
      <Skeleton variant="rectangular" width={120} height={60} />
    </div>
  ),
};
