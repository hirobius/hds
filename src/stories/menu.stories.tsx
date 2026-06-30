/**
 * Menu stories — dropdown menu.
 * @see src/app/components/menu.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Menu } from '../app/components/menu';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/menu',
  component: Menu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Radix-backed dropdown menu. Compound parts: Trigger / Content / Item / CheckboxItem / RadioGroup+RadioItem / Label / Separator / Group / Sub+SubTrigger+SubContent.',
      },
    },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">Actions</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Account</Menu.Label>
        <Menu.Item>Profile</Menu.Item>
        <Menu.Item>Settings</Menu.Item>
        <Menu.Separator />
        <Menu.Item disabled>Sign out</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
};
