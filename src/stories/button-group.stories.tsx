/**
 * ButtonGroup stories.
 * @see src/app/components/button-group.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ButtonGroup } from '../app/components/button-group';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/button-group',
  component: ButtonGroup,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: { type: 'inline-radio' }, options: ['horizontal', 'vertical'] },
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button>Left</Button>
      <Button>Center</Button>
      <Button>Right</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button>Top</Button>
      <Button>Middle</Button>
      <Button>Bottom</Button>
    </ButtonGroup>
  ),
};
