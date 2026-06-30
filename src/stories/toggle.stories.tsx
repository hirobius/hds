/**
 * HdsToggle stories — on, off, disabled, and group demos.
 * @see src/app/components/toggle.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { HdsToggle } from '../app/components/toggle';

const meta = {
  title: 'Primitives/toggle',
  component: HdsToggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Boolean on/off toggle with animated thumb. Renders as a styled checkbox under the hood.',
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof HdsToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <HdsToggle
      label="Enable notifications"
      checked={checked}
      onChange={setChecked}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function OnDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <HdsToggle
      label="Show component previews"
      checked={checked}
      onChange={setChecked}
    />
  );
}

export const On: Story = {
  render: () => <OnDemo />,
};

export const Disabled: Story = {
  args: {
    label: 'Beta features',
    checked: false,
    onChange: () => {},
    disabled: true,
  },
};

export const DisabledOn: Story = {
  args: {
    label: 'Beta features',
    checked: true,
    onChange: () => {},
    disabled: true,
  },
};

function SettingsGroupDemo() {
  const [settings, setSettings] = useState({
    notifications: true,
    analytics: false,
    autoSave: true,
  });
  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <HdsToggle
        label="Push notifications"
        checked={settings.notifications}
        onChange={() => toggle('notifications')}
      />
      <HdsToggle
        label="Usage analytics"
        checked={settings.analytics}
        onChange={() => toggle('analytics')}
      />
      <HdsToggle
        label="Auto-save drafts"
        checked={settings.autoSave}
        onChange={() => toggle('autoSave')}
      />
    </div>
  );
}

export const SettingsGroup: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Multiple independent toggles in a settings panel.',
      },
    },
  },
  render: () => <SettingsGroupDemo />,
};
