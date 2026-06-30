/**
 * Combobox stories — searchable single-select built on Popover.
 * @see src/app/components/combobox.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle the open Popover. Stories render the trigger
 * button only; the dropdown opens on click.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Combobox } from '../app/components/combobox';

const meta = {
  title: 'Primitives/combobox',
  component: Combobox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Searchable single-select built on Popover + a filtered listbox. Full keyboard support: ↑/↓ to navigate, Enter to choose, Esc to close. Controlled via value + onChange.',
      },
    },
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Shared option lists ───────────────────────────────────────────────────────

const COMPONENT_OPTIONS = [
  { value: 'button', label: 'Button' },
  { value: 'badge', label: 'Badge' },
  { value: 'dialog', label: 'Dialog' },
  { value: 'popover', label: 'Popover' },
  { value: 'tabs', label: 'Tabs' },
  { value: 'input', label: 'Input' },
  { value: 'select', label: 'Select' },
  { value: 'combobox', label: 'Combobox' },
];

const PHASE_OPTIONS = [
  { value: 'phase-1', label: 'Phase 1 — Primitives' },
  { value: 'phase-2', label: 'Phase 2 — Patterns' },
  { value: 'phase-3', label: 'Phase 3 — Templates' },
];

const STATUS_OPTIONS = [
  { value: 'stable', label: 'Stable' },
  { value: 'beta', label: 'Beta' },
  { value: 'deprecated', label: 'Deprecated', disabled: true },
];

// ── Default ──────────────────────────────────────────────────────────────────

function DefaultDemo() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ width: '280px' }}>
      <Combobox
        options={COMPONENT_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Select a component…"
        aria-label="HDS component"
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

// ── Pre-selected value ────────────────────────────────────────────────────────

function PreSelectedDemo() {
  const [value, setValue] = useState<string | null>('dialog');
  return (
    <div style={{ width: '280px' }}>
      <Combobox
        options={COMPONENT_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Select a component…"
        aria-label="HDS component"
      />
    </div>
  );
}

export const PreSelected: Story = {
  parameters: {
    docs: {
      description: { story: 'Combobox with an initial selection passed via value.' },
    },
  },
  render: () => <PreSelectedDemo />,
};

// ── Few options ───────────────────────────────────────────────────────────────

function FewOptionsDemo() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ width: '280px' }}>
      <Combobox
        options={PHASE_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Select phase…"
        searchPlaceholder="Filter phases…"
        aria-label="HDS phase"
      />
    </div>
  );
}

export const FewOptions: Story = {
  parameters: {
    docs: {
      description: { story: 'Short option list — still searchable but no scroll needed.' },
    },
  },
  render: () => <FewOptionsDemo />,
};

// ── With disabled option ──────────────────────────────────────────────────────

function WithDisabledDemo() {
  const [value, setValue] = useState<string | null>('stable');
  return (
    <div style={{ width: '280px' }}>
      <Combobox
        options={STATUS_OPTIONS}
        value={value}
        onChange={setValue}
        placeholder="Select status…"
        emptyMessage="No matching status"
        aria-label="Component status"
      />
    </div>
  );
}

export const WithDisabledOption: Story = {
  parameters: {
    docs: {
      description: {
        story: 'An option with disabled: true is rendered but non-interactive.',
      },
    },
  },
  render: () => <WithDisabledDemo />,
};

// ── Disabled trigger ──────────────────────────────────────────────────────────

export const DisabledTrigger: Story = {
  parameters: {
    docs: {
      description: { story: 'The whole combobox can be disabled via the disabled prop.' },
    },
  },
  render: () => (
    <div style={{ width: '280px' }}>
      <Combobox
        options={COMPONENT_OPTIONS}
        value={null}
        onChange={() => {}}
        placeholder="Unavailable"
        aria-label="Disabled combobox"
        disabled
      />
    </div>
  ),
};
