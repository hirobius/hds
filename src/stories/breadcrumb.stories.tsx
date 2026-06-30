/**
 * Breadcrumb stories — hierarchical trail.
 * @see src/app/components/breadcrumb.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from '../app/components/breadcrumb';

const meta = {
  title: 'Patterns/breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Hierarchical navigation trail. Links route through the HDS router seam (anchors with no router); the last item is the current page (aria-current).',
      },
    },
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Components', href: '/components' },
      { label: 'Breadcrumb' },
    ],
  },
};
