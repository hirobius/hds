/**
 * DateRangeInput stories — date-range field built on Popover + Calendar.
 * @see src/app/components/date-range-input.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle the open Popover. Stories render the trigger
 * button only; the calendar opens on click.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { DateRangeInput } from '../app/components/date-range-input';

const meta = {
  title: 'Patterns/date-range-input',
  component: DateRangeInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Date-range field composing the HDS Popover with Calendar in range mode. Controlled via value + onChange.',
      },
    },
  },
} satisfies Meta<typeof DateRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [value, setValue] = useState<DateRange | undefined>(undefined);
  return (
    <div style={{ width: '280px' }}>
      <DateRangeInput value={value} onChange={setValue} />
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function PreSelectedDemo() {
  const [value, setValue] = useState<DateRange | undefined>({
    from: new Date('2026-07-01'),
    to: new Date('2026-07-10'),
  });
  return (
    <div style={{ width: '280px' }}>
      <DateRangeInput value={value} onChange={setValue} />
    </div>
  );
}

export const PreSelected: Story = {
  parameters: {
    docs: {
      description: { story: 'DateRangeInput with an initial range passed via value.' },
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
      <DateRangeInput value={undefined} onChange={() => {}} disabled />
    </div>
  ),
};
