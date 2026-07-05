/**
 * HdsMultiSelector stories — multi-select dropdown built on Popover.
 * @see src/app/components/hds-multi-selector.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle the open Popover. Stories render the trigger
 * button only; the option list opens on click.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { HdsMultiSelector } from '../app/components/hds-multi-selector';

const meta = {
  title: 'Patterns/hds-multi-selector',
  component: HdsMultiSelector,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Multi-select dropdown composing the HDS Popover with a checkbox option list. Controlled via value + onChange.',
      },
    },
  },
} satisfies Meta<typeof HdsMultiSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const FRUIT_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
];

function DefaultDemo() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <div style={{ width: '280px' }}>
      <HdsMultiSelector options={FRUIT_OPTIONS} value={value} onChange={setValue} />
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function PreSelectedDemo() {
  const [value, setValue] = useState<string[]>(['banana', 'date']);
  return (
    <div style={{ width: '280px' }}>
      <HdsMultiSelector options={FRUIT_OPTIONS} value={value} onChange={setValue} />
    </div>
  );
}

export const PreSelected: Story = {
  parameters: {
    docs: {
      description: { story: 'HdsMultiSelector with an initial selection passed via value.' },
    },
  },
  render: () => <PreSelectedDemo />,
};

export const DisabledTrigger: Story = {
  parameters: {
    docs: {
      description: { story: 'The whole control can be disabled via the disabled prop.' },
    },
  },
  render: () => (
    <div style={{ width: '280px' }}>
      <HdsMultiSelector options={FRUIT_OPTIONS} value={[]} onChange={() => {}} disabled />
    </div>
  ),
};
