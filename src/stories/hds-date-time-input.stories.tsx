/**
 * HdsDateTimeInput stories — date text field + calendar popover paired with
 * a native time field, composing to one Date.
 * @see src/app/components/hds-date-time-input.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle the open Popover. Stories render the field only;
 * the calendar opens on click of the leading icon button.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { HdsDateTimeInput } from '../app/components/hds-date-time-input';

const meta = {
  title: 'Patterns/hds-date-time-input',
  component: HdsDateTimeInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Combined date + time field pairing a text date input and calendar popover (HdsCalendar) with a native time field (HdsTimeInput). Controlled via value + onChange.',
      },
    },
  },
} satisfies Meta<typeof HdsDateTimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [value, setValue] = useState<Date | undefined>(undefined);
  return (
    <div style={{ width: '320px' }}>
      <HdsDateTimeInput value={value} onChange={setValue} aria-label="Appointment" />
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function WithInitialValueDemo() {
  const [value, setValue] = useState<Date | undefined>(new Date('2026-07-15T09:30'));
  return (
    <div style={{ width: '320px' }}>
      <HdsDateTimeInput value={value} onChange={setValue} aria-label="Appointment" />
    </div>
  );
}

export const WithInitialValue: Story = {
  parameters: {
    docs: {
      description: { story: 'HdsDateTimeInput with an initial date and time passed via value.' },
    },
  },
  render: () => <WithInitialValueDemo />,
};
