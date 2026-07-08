/**
 * FileInput stories.
 * @see src/app/components/file-input.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { FileInput } from '../app/components/file-input';

const meta = {
  title: 'Patterns/file-input',
  component: FileInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const MultipleImages: Story = {
  args: {
    label: 'Drop images here or click to browse',
    accept: 'image/*',
    multiple: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
