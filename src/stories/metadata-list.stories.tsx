/**
 * MetadataList stories.
 * @see src/app/components/metadata-list.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { MetadataList } from '../app/components/metadata-list';

const meta = {
  title: 'Patterns/metadata-list',
  component: MetadataList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: { type: 'select' }, options: ['vertical', 'horizontal'] },
  },
} satisfies Meta<typeof MetadataList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { term: 'Status', description: 'Active' },
      { term: 'Owner', description: 'Adrian' },
      { term: 'Updated', description: 'Jul 2026' },
    ],
  },
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
    items: [
      { term: 'Status', description: 'Active' },
      { term: 'Owner', description: 'Adrian' },
      { term: 'Updated', description: 'Jul 2026' },
    ],
  },
};
