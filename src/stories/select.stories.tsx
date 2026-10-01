/**
 * Select stories — dropdown selector on Radix Select.
 * @see src/app/components/select.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle open Radix content. Do not force the listbox open
 * on mount. `Open` opens it in its play function, which the jsdom smoke gates
 * never run, so the Storybook axe gate scans the open listbox (hds#407).
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Select } from '../app/components/select';
import { designParameters } from './design-parameters';
import { openListbox } from './lib/open-listbox';

const meta = {
  title: 'Primitives/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Select'),
    layout: 'centered',
    docs: {
      description: {
        component:
          'Dropdown selector built on Radix Select. Radix owns the listbox a11y contract (managed focus, typeahead, full keyboard, collision-aware positioning). Controlled via value/onChange.',
      },
    },
  },
} satisfies Meta<typeof Select>;

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
      <Select
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
    docs: {
      description: {
        story:
          'Hide the field label with showLabel={false}; the trigger is still named by the label and the value.',
      },
    },
  },
  render: () => <ControlledDemo showLabel={false} />,
};

// The play function opens it, so the Storybook axe gate scans the open
// listbox (hds#407). Docs pages do not run play functions, so it is left off
// the docs page rather than shown there closed.
export const Open: Story = {
  tags: ['!autodocs'],
  render: () => <ControlledDemo />,
  play: async ({ canvasElement }) => {
    await openListbox(canvasElement);
  },
};
