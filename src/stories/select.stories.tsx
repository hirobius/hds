/**
 * HdsSelect stories — labelled + label-less dropdowns on Radix Select.
 * @see src/app/components/select.tsx
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HdsSelect } from '../app/components/select';

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const meta = {
  title: 'Primitives/select',
  component: HdsSelect,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dropdown selector on Radix Select. Radix owns the listbox a11y contract (managed focus + active-descendant, typeahead, full keyboard, collision-aware positioning). Controlled via value/onChange.',
      },
    },
  },
} satisfies Meta<typeof HdsSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('editor');
    return <HdsSelect label="Role" options={roleOptions} value={value} onChange={setValue} />;
  },
};

export const WithoutLabel: Story = {
  parameters: {
    docs: { description: { story: 'showLabel=false hides the visible label; the trigger keeps an accessible name.' } },
  },
  render: () => {
    const [value, setValue] = useState('viewer');
    return (
      <HdsSelect label="Role" showLabel={false} options={roleOptions} value={value} onChange={setValue} />
    );
  },
};

export const ManyOptions: Story = {
  render: () => {
    const options = Array.from({ length: 12 }, (_, i) => ({
      value: `opt-${i + 1}`,
      label: `Option ${i + 1}`,
    }));
    const [value, setValue] = useState('opt-1');
    return <HdsSelect label="Choose one" options={options} value={value} onChange={setValue} />;
  },
};
