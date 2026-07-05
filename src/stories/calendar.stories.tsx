/**
 * Calendar stories.
 * @see src/app/components/calendar.tsx
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '../app/components/calendar';

const meta = {
  title: 'Primitives/calendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

function SingleDemo() {
  const [selected, setSelected] = React.useState<Date | undefined>(new Date('2026-07-15'));
  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={setSelected}
      defaultMonth={new Date('2026-07-01')}
    />
  );
}

function RangeDemo() {
  const [range, setRange] = React.useState<DateRange | undefined>();
  return (
    <Calendar
      mode="range"
      numberOfMonths={2}
      selected={range}
      onSelect={setRange}
      defaultMonth={new Date('2026-07-01')}
    />
  );
}

export const Single: Story = { render: () => <SingleDemo /> };
export const Range: Story = { render: () => <RangeDemo /> };
