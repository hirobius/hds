/**
 * Blockquote stories.
 * @see src/app/components/blockquote.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Blockquote } from '../app/components/blockquote';

const meta = {
  title: 'Primitives/blockquote',
  component: Blockquote,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Blockquote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Simplicity is the ultimate sophistication.' },
};

export const WithAttribution: Story = {
  render: () => (
    <Blockquote attribution="— Leonardo da Vinci">
      Simplicity is the ultimate sophistication.
    </Blockquote>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
      <Blockquote size="sm">Small quote.</Blockquote>
      <Blockquote size="md">Medium quote.</Blockquote>
      <Blockquote size="lg">Large quote.</Blockquote>
    </div>
  ),
};
