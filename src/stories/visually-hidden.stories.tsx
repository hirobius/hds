/**
 * VisuallyHidden stories.
 * @see src/app/components/visually-hidden.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { VisuallyHidden } from '../app/components/visually-hidden';

const meta = {
  title: 'Primitives/visually-hidden',
  component: VisuallyHidden,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <button type="button">
      <span aria-hidden="true">✕</span>
      <VisuallyHidden>Close dialog</VisuallyHidden>
    </button>
  ),
};
