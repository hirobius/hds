/**
 * Breadcrumb stories — hierarchical navigation trail demos.
 * @see src/app/components/breadcrumb.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from '../app/components/breadcrumb';

const meta = {
  title: 'Primitives/breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Hierarchical navigation trail from root to current page. The final item renders as plain text (aria-current="page"); earlier items render as links.',
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

export const ShallowTrail: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Breadcrumb' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Two-level trail — root plus current page.',
      },
    },
  },
};

export const DeepTrail: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Design System', href: '/design-system' },
      { label: 'Navigation', href: '/design-system/navigation' },
      { label: 'Patterns', href: '/design-system/navigation/patterns' },
      { label: 'Breadcrumb' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Deep multi-level trail showing wrapping behaviour at five levels.',
      },
    },
  },
};

export const SingleCrumb: Story = {
  args: {
    items: [{ label: 'Home' }],
  },
  parameters: {
    docs: {
      description: {
        story: 'Degenerate case — a single crumb with no ancestor links.',
      },
    },
  },
};

export const CustomLabel: Story = {
  args: {
    label: 'Site navigation path',
    items: [
      { label: 'Portfolio', href: '/portfolio' },
      { label: 'Case Studies', href: '/portfolio/case-studies' },
      { label: 'Hirobius Design System' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom accessible label on the nav landmark for portfolio surfaces.',
      },
    },
  },
};
