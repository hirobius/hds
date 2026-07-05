/**
 * ToggleButton stories.
 * @see src/app/components/toggle-button.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ToggleButton } from '../app/components/toggle-button';

const meta = {
  title: 'Primitives/toggle-button',
  component: ToggleButton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: { type: 'inline-radio' }, options: ['secondary', 'ghost'] },
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof ToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Bold', 'aria-label': 'Bold' } };

export const Pressed: Story = {
  args: { children: 'Bold', 'aria-label': 'Bold', defaultPressed: true },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px' }}>
      <ToggleButton variant="secondary" aria-label="Secondary">
        Secondary
      </ToggleButton>
      <ToggleButton variant="ghost" aria-label="Ghost">
        Ghost
      </ToggleButton>
    </div>
  ),
};
