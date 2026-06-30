/**
 * Avatar stories — image + initials fallback.
 * @see src/app/components/avatar.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '../app/components/avatar';

const meta = {
  title: 'Primitives/avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Circular avatar. Renders the image when `src` loads, else initials derived from `alt` (or explicit `initials`). onError falls back to initials.',
      },
    },
  },
  argTypes: {
    size: { control: { type: 'radio' }, options: ['sm', 'md', 'lg'] },
    alt: { control: 'text' },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = { args: { alt: 'Adrian Milsap', size: 'md' } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Avatar alt="Adrian Milsap" size="sm" />
      <Avatar alt="Adrian Milsap" size="md" />
      <Avatar alt="Adrian Milsap" size="lg" />
    </div>
  ),
};
