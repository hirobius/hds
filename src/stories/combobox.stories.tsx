/**
 * Combobox stories — searchable single-select.
 * @see src/app/components/combobox.tsx
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Combobox } from '../app/components/combobox';

const meta = {
  title: 'Patterns/combobox',
  component: Combobox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Searchable single-select on the HDS Popover. Trigger shows the selection; opening reveals a filterable list with keyboard support. Controlled via `value` + `onChange`.',
      },
    },
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

function ComboboxDemo() {
  const [value, setValue] = useState<string | null>('us');
  return (
    <div style={{ width: 280 }}>
      <Combobox
        aria-label="Country"
        value={value}
        onChange={setValue}
        options={[
          { value: 'us', label: 'United States' },
          { value: 'ca', label: 'Canada' },
          { value: 'mx', label: 'Mexico' },
          { value: 'uk', label: 'United Kingdom' },
        ]}
      />
    </div>
  );
}

export const Default: Story = { render: () => <ComboboxDemo /> };
