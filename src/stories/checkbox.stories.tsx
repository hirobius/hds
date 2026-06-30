/**
 * HdsCheckbox stories — checked, indeterminate, and disabled states.
 * @see src/app/components/checkbox.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { HdsCheckbox } from '../app/components/checkbox';

const meta = {
  title: 'Primitives/checkbox',
  component: HdsCheckbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Custom-drawn checkbox with check and indeterminate glyphs, animated via Motion.',
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof HdsCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <HdsCheckbox
      label="Receive project update emails"
      checked={checked}
      onChange={setChecked}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function CheckedDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <HdsCheckbox
      label="Include archived projects"
      checked={checked}
      onChange={setChecked}
    />
  );
}

export const Checked: Story = {
  render: () => <CheckedDemo />,
};

function IndeterminateDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <HdsCheckbox
      label="Select all components"
      checked={checked}
      onChange={setChecked}
      indeterminate
    />
  );
}

export const Indeterminate: Story = {
  render: () => <IndeterminateDemo />,
};

export const Disabled: Story = {
  args: {
    label: 'Enable experimental features',
    checked: false,
    onChange: () => {},
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: 'Enable experimental features',
    checked: true,
    onChange: () => {},
    disabled: true,
  },
};

function GroupDemo() {
  const [values, setValues] = useState({
    components: true,
    tokens: false,
    motion: true,
  });
  const toggle = (key: keyof typeof values) =>
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <HdsCheckbox
        label="Components"
        checked={values.components}
        onChange={() => toggle('components')}
      />
      <HdsCheckbox
        label="Design tokens"
        checked={values.tokens}
        onChange={() => toggle('tokens')}
      />
      <HdsCheckbox
        label="Motion presets"
        checked={values.motion}
        onChange={() => toggle('motion')}
      />
    </div>
  );
}

export const Group: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Multiple independent checkboxes in a vertical group.',
      },
    },
  },
  render: () => <GroupDemo />,
};
