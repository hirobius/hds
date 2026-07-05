/**
 * TreeList stories.
 * @see src/app/components/tree-list.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { TreeList, type TreeNode } from '../app/components/tree-list';

const fileTree: TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'button.tsx' },
          { id: 'input', label: 'input.tsx' },
        ],
      },
    ],
  },
  {
    id: 'docs',
    label: 'docs',
    children: [{ id: 'intro', label: 'intro.md' }],
  },
];

const meta = {
  title: 'Patterns/tree-list',
  component: TreeList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TreeList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { items: fileTree },
};

export const WithDefaultExpanded: Story = {
  args: { items: fileTree, defaultExpandedIds: ['src', 'components'] },
};
