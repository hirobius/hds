/**
 * DateInput stories — text field + calendar popover for a single date.
 * @see src/app/components/date-input.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle the open Popover. Stories render the field only;
 * the calendar opens on click of the trailing icon button.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DateInput } from '../app/components/date-input';

const meta = {
  title: 'Patterns/date-input',
  component: DateInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Single-date text field with a calendar popover picker, built on the HDS Popover and Calendar. Controlled via value + onChange.',
      },
    },
  },
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [value, setValue] = useState<Date | undefined>(undefined);
  return (
    <div style={{ width: '240px' }}>
      <DateInput value={value} onChange={setValue} aria-label="Date" />
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function WithInitialValueDemo() {
  const [value, setValue] = useState<Date | undefined>(new Date('2026-07-15'));
  return (
    <div style={{ width: '240px' }}>
      <DateInput value={value} onChange={setValue} aria-label="Date" />
    </div>
  );
}

export const WithInitialValue: Story = {
  parameters: {
    docs: {
      description: { story: 'DateInput with an initial date passed via value.' },
    },
  },
  render: () => <WithInitialValueDemo />,
};
