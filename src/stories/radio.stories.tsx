/**
 * HdsRadio stories — selected, unselected, disabled, and group demos.
 * @see src/app/components/radio.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { HdsRadio } from '../app/components/radio';

const meta = {
  title: 'Primitives/radio',
  component: HdsRadio,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Radio button with animated selection indicator. Use in groups for mutually-exclusive choices.',
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof HdsRadio>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <HdsRadio
      label="Automatic theme detection"
      checked={checked}
      onChange={setChecked}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function SelectedDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <HdsRadio
      label="Dark mode"
      checked={checked}
      onChange={setChecked}
    />
  );
}

export const Selected: Story = {
  render: () => <SelectedDemo />,
};

export const Disabled: Story = {
  args: {
    label: 'Custom theme (coming soon)',
    checked: false,
    onChange: () => {},
    disabled: true,
  },
};

export const DisabledSelected: Story = {
  args: {
    label: 'Custom theme (coming soon)',
    checked: true,
    onChange: () => {},
    disabled: true,
  },
};

type Theme = 'system' | 'light' | 'dark';

function GroupDemo() {
  const [selected, setSelected] = useState<Theme>('system');
  const options: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System default' },
    { value: 'light', label: 'Light mode' },
    { value: 'dark', label: 'Dark mode' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
    >
      {options.map((opt) => (
        <HdsRadio
          key={opt.value}
          name="theme"
          label={opt.label}
          checked={selected === opt.value}
          onChange={() => setSelected(opt.value)}
        />
      ))}
    </div>
  );
}

export const Group: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Mutually-exclusive radio group — only one option selected at a time.',
      },
    },
  },
  render: () => <GroupDemo />,
};
