/**
 * HdsCheckbox stories — checked / indeterminate / disabled.
 * @see src/app/components/checkbox.tsx
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HdsCheckbox } from '../app/components/checkbox';

const meta = {
  title: 'Primitives/checkbox',
  component: HdsCheckbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Custom-drawn checkbox with a check / indeterminate glyph. Controlled via `checked` + `onChange`; supports `indeterminate` and `disabled`.',
      },
    },
  },
} satisfies Meta<typeof HdsCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

function CheckboxDemo() {
  const [on, setOn] = useState(true);
  return <HdsCheckbox label="Email me updates" checked={on} onChange={setOn} />;
}

export const Default: Story = { render: () => <CheckboxDemo /> };

export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <HdsCheckbox label="Checked" checked onChange={() => {}} />
      <HdsCheckbox label="Unchecked" checked={false} onChange={() => {}} />
      <HdsCheckbox label="Indeterminate" checked={false} indeterminate onChange={() => {}} />
      <HdsCheckbox label="Disabled" checked={false} disabled onChange={() => {}} />
    </div>
  ),
};
