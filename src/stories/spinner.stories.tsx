/**
 * Spinner stories — sizes.
 * @see src/app/components/spinner.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from '../app/components/spinner';

const meta = {
  title: 'Primitives/spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Indeterminate loading indicator. Inherits the surrounding text color (currentColor); honors prefers-reduced-motion. role="status" with an accessible label.',
      },
    },
  },
  argTypes: {
    size: { control: { type: 'radio' }, options: ['sm', 'md', 'lg'] },
    label: { control: 'text' },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { size: 'md', label: 'Loading' } };

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};
