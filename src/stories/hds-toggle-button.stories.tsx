/**
 * HdsToggleButton stories.
 * @see src/app/components/hds-toggle-button.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsToggleButton } from '../app/components/hds-toggle-button';

const meta = {
  title: 'Primitives/hds-toggle-button',
  component: HdsToggleButton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: { type: 'inline-radio' }, options: ['secondary', 'ghost'] },
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof HdsToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Bold', 'aria-label': 'Bold' } };

export const Pressed: Story = {
  args: { children: 'Bold', 'aria-label': 'Bold', defaultPressed: true },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px' }}>
      <HdsToggleButton variant="secondary" aria-label="Secondary">
        Secondary
      </HdsToggleButton>
      <HdsToggleButton variant="ghost" aria-label="Ghost">
        Ghost
      </HdsToggleButton>
    </div>
  ),
};
