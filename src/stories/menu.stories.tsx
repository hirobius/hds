/**
 * Menu stories — dropdown menu with items, labels, separators, and radio groups.
 * @see src/app/components/menu.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle open Radix dropdown content. Do not set defaultOpen.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Menu } from '../app/components/menu';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/menu',
  component: Menu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Dropdown menu with keyboard navigation, type-ahead, and rich item types. Compound API: Menu.Trigger / Menu.Content / Menu.Item / Menu.Label / Menu.Separator / Menu.CheckboxItem / Menu.RadioGroup / Menu.RadioItem / Menu.Sub / Menu.SubTrigger / Menu.SubContent.',
      },
    },
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default ──────────────────────────────────────────────────────────────────

function DefaultDemo() {
  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">Actions</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Component</Menu.Label>
        <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
        <Menu.Item onSelect={() => {}}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => {}}>Archive</Menu.Item>
        <Menu.Item disabled onSelect={() => {}}>Delete</Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

// ── With checkbox items ───────────────────────────────────────────────────────

function CheckboxDemo() {
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">View options</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Visibility</Menu.Label>
        <Menu.CheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
          Show grid
        </Menu.CheckboxItem>
        <Menu.CheckboxItem checked={showLabels} onCheckedChange={setShowLabels}>
          Show labels
        </Menu.CheckboxItem>
      </Menu.Content>
    </Menu>
  );
}

export const WithCheckboxItems: Story = {
  parameters: {
    docs: {
      description: { story: 'Menu with togglable checkbox items for persistent view settings.' },
    },
  },
  render: () => <CheckboxDemo />,
};

// ── With radio group ─────────────────────────────────────────────────────────

function RadioGroupDemo() {
  const [density, setDensity] = useState('comfortable');

  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">Density: {density}</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Row density</Menu.Label>
        <Menu.RadioGroup value={density} onValueChange={setDensity}>
          <Menu.RadioItem value="compact">Compact</Menu.RadioItem>
          <Menu.RadioItem value="comfortable">Comfortable</Menu.RadioItem>
          <Menu.RadioItem value="spacious">Spacious</Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu>
  );
}

export const WithRadioGroup: Story = {
  parameters: {
    docs: {
      description: { story: 'Radio group inside a menu for mutually-exclusive selection.' },
    },
  },
  render: () => <RadioGroupDemo />,
};

// ── With submenu ─────────────────────────────────────────────────────────────

function SubMenuDemo() {
  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">Export</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item onSelect={() => {}}>Copy link</Menu.Item>
        <Menu.Separator />
        <Menu.Sub>
          <Menu.SubTrigger>Download as</Menu.SubTrigger>
          <Menu.SubContent>
            <Menu.Item onSelect={() => {}}>PNG</Menu.Item>
            <Menu.Item onSelect={() => {}}>SVG</Menu.Item>
            <Menu.Item onSelect={() => {}}>PDF</Menu.Item>
          </Menu.SubContent>
        </Menu.Sub>
      </Menu.Content>
    </Menu>
  );
}

export const WithSubmenu: Story = {
  parameters: {
    docs: {
      description: { story: 'Nested submenu via Menu.Sub / Menu.SubTrigger / Menu.SubContent.' },
    },
  },
  render: () => <SubMenuDemo />,
};
