/**
 * Avatar stories — size and image/initials fallback demos.
 * @see src/app/components/avatar.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../app/components/avatar';

const meta = {
  title: 'Primitives/avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Circular avatar. Renders an image when `src` is provided; falls back to initials derived from `alt` when the image is absent or fails to load.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'radio' },
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    alt: 'Adrian Milsap',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    alt: 'Adrian Milsap',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    alt: 'Adrian Milsap',
    size: 'lg',
  },
};

export const WithImage: Story = {
  args: {
    alt: 'Adrian Milsap',
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    size: 'md',
  },
};

export const ExplicitInitials: Story = {
  args: {
    alt: 'Design System Bot',
    initials: 'DS',
    size: 'md',
  },
};

export const AllSizes: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All three sizes rendered side-by-side with initials fallback.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Avatar alt="Adrian Milsap" size="sm" />
      <Avatar alt="Adrian Milsap" size="md" />
      <Avatar alt="Adrian Milsap" size="lg" />
    </div>
  ),
};
