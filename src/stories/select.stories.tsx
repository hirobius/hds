/**
 * HdsSelect stories — dropdown selector on Radix Select.
 * @see src/app/components/select.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle open Radix content. Do not force the listbox open.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { HdsSelect } from '../app/components/select';

const meta = {
  title: 'Primitives/select',
  component: HdsSelect,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Dropdown selector built on Radix Select. Radix owns the listbox a11y contract (managed focus, typeahead, full keyboard, collision-aware positioning). Controlled via value/onChange.',
      },
    },
  },
} satisfies Meta<typeof HdsSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const FRAMEWORKS = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'astro', label: 'Astro' },
];

function ControlledDemo({ showLabel = true }: { showLabel?: boolean }) {
  const [value, setValue] = React.useState('react');
  return (
    <div style={{ minWidth: 220 }}>
      <HdsSelect
        label="Framework"
        showLabel={showLabel}
        options={FRAMEWORKS}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <ControlledDemo />,
};

export const NoLabel: Story = {
  parameters: {
    docs: { description: { story: 'Hide the field label with showLabel={false}; it still labels the trigger for a11y.' } },
  },
  render: () => <ControlledDemo showLabel={false} />,
};
