/**
 * AvatarGroup stories.
 * @see src/app/components/avatar-group.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { AvatarGroup } from '../app/components/avatar-group';
import { Avatar } from '../app/components/avatar';

const meta = {
  title: 'Primitives/avatar-group',
  component: AvatarGroup,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof AvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar alt="Ada Lovelace" />
      <Avatar alt="Alan Turing" />
      <Avatar alt="Grace Hopper" />
    </AvatarGroup>
  ),
};

export const WithOverflow: Story = {
  render: () => (
    <AvatarGroup max={3}>
      <Avatar alt="Ada Lovelace" />
      <Avatar alt="Alan Turing" />
      <Avatar alt="Grace Hopper" />
      <Avatar alt="Katherine Johnson" />
      <Avatar alt="Dorothy Vaughan" />
    </AvatarGroup>
  ),
};
