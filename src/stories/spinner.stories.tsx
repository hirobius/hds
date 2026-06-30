/**
 * Spinner stories — size and color-inheritance demos.
 * @see src/app/components/spinner.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from '../app/components/spinner';

const meta = {
  title: 'Primitives/spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Indeterminate loading spinner. Inherits the surrounding text color via `currentColor`. Sizes: sm | md | lg.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'radio' },
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    label: 'Loading',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    label: 'Loading',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    label: 'Loading',
  },
};

export const CustomLabel: Story = {
  args: {
    size: 'md',
    label: 'Saving changes',
  },
};

export const AllSizes: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All three sizes rendered side-by-side.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Spinner size="sm" label="Loading small" />
      <Spinner size="md" label="Loading medium" />
      <Spinner size="lg" label="Loading large" />
    </div>
  ),
};

export const ColorInheritance: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Spinner inherits the surrounding text color via `currentColor`.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <span style={{ color: 'var(--semantic-color-feedback-success)' }}>
        <Spinner size="md" label="Success spinner" />
      </span>
      <span style={{ color: 'var(--semantic-color-feedback-warning)' }}>
        <Spinner size="md" label="Warning spinner" />
      </span>
      <span style={{ color: 'var(--semantic-color-feedback-error)' }}>
        <Spinner size="md" label="Error spinner" />
      </span>
    </div>
  ),
};
