/**
 * Popover stories — anchored floating surface.
 * @see src/app/components/popover.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Popover } from '../app/components/popover';
import { Button } from '../app/components/button';
import { Text } from '../app/components/text';

const meta = {
  title: 'Primitives/popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Radix-backed floating surface anchored to a trigger. Compound parts: Popover.Trigger / Anchor / Content / Close. Overlay role tokens, collision-aware positioning.',
      },
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <Popover.Trigger asChild>
        <Button variant="secondary">Open popover</Button>
      </Popover.Trigger>
      <Popover.Content>
        <Text variant="ui">Anchored floating surface with collision-aware positioning.</Text>
      </Popover.Content>
    </Popover>
  ),
};
