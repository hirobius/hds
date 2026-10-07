/**
 * Kbd stories.
 * @see src/app/components/kbd.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from '../app/components/kbd';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  parameters: { ...designParameters('Kbd'), layout: 'padded' },
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: '⌘K' } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Kbd size="sm">Esc</Kbd>
      <Kbd size="md">Enter</Kbd>
      <Kbd size="lg">Space</Kbd>
    </div>
  ),
};

export const Combination: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Kbd>⌘</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>P</Kbd>
    </span>
  ),
};
