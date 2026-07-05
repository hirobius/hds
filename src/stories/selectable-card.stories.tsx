/**
 * SelectableCard stories.
 * @see src/app/components/selectable-card.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SelectableCard } from '../app/components/selectable-card';

const meta = {
  title: 'Patterns/selectable-card',
  component: SelectableCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SelectableCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Plan A' },
};

export const Selected: Story = {
  args: { children: 'Plan A', selected: true },
};

export const Disabled: Story = {
  args: { children: 'Plan A', disabled: true },
};

function PlanPickerDemo() {
  const [plan, setPlan] = useState<'a' | 'b'>('a');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px' }}>
      <SelectableCard selected={plan === 'a'} onSelectedChange={() => setPlan('a')}>
        Plan A — $9/mo
      </SelectableCard>
      <SelectableCard selected={plan === 'b'} onSelectedChange={() => setPlan('b')}>
        Plan B — $19/mo
      </SelectableCard>
    </div>
  );
}

export const PlanPicker: Story = {
  render: () => <PlanPickerDemo />,
};
