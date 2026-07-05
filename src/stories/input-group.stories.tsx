/**
 * InputGroup stories.
 * @see src/app/components/input-group.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { InputGroup } from '../app/components/input-group';

const meta = {
  title: 'Primitives/input-group',
  component: InputGroup,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Search', 'aria-label': 'Search' },
};

export const WithAdornments: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px' }}>
      <InputGroup leading="$" placeholder="0.00" aria-label="Amount" trailing="USD" />
      <InputGroup leading="@" placeholder="handle" aria-label="Username" />
    </div>
  ),
};
