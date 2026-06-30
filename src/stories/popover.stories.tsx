/**
 * Popover stories — floating surface anchored to a trigger.
 * @see src/app/components/popover.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle open Radix content. Do not set defaultOpen.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Popover } from '../app/components/popover';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Floating surface anchored to a trigger. Provides outside-click + ESC dismissal and collision-aware positioning via Radix Popover. Compound API: Popover.Trigger / Popover.Content / Popover.Anchor / Popover.Close.',
      },
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default ──────────────────────────────────────────────────────────────────

function DefaultDemo() {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button variant="secondary">Open popover</Button>
      </Popover.Trigger>
      <Popover.Content>
        <p className="text-sm text-muted-foreground">
          This is a floating surface. Click outside or press Esc to dismiss.
        </p>
      </Popover.Content>
    </Popover>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

// ── With dismiss button ───────────────────────────────────────────────────────

function WithDismissDemo() {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button variant="secondary">Filter options</Button>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Filter by status</p>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <label><input type="checkbox" className="mr-2" />In progress</label>
            <label><input type="checkbox" className="mr-2" />Published</label>
            <label><input type="checkbox" className="mr-2" />Archived</label>
          </div>
          <Popover.Close asChild>
            <Button variant="primary" size="sm">Apply</Button>
          </Popover.Close>
        </div>
      </Popover.Content>
    </Popover>
  );
}

export const WithDismiss: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Popover with an explicit dismiss button using Popover.Close.',
      },
    },
  },
  render: () => <WithDismissDemo />,
};

// ── Info tip ─────────────────────────────────────────────────────────────────

function InfoTipDemo() {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button variant="tertiary" size="sm">What is Phase 2?</Button>
      </Popover.Trigger>
      <Popover.Content>
        <p className="text-sm text-muted-foreground">
          Phase 2 covers pattern-level components (Combobox, Toast, Command Palette) built
          on top of the Phase 1 primitives. Targeting Q3 2026.
        </p>
      </Popover.Content>
    </Popover>
  );
}

export const InfoTip: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Lightweight info tip pattern for contextual glossary or roadmap details.',
      },
    },
  },
  render: () => <InfoTipDemo />,
};

// ── Aligned start ─────────────────────────────────────────────────────────────

function AlignedStartDemo() {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button variant="secondary">Align start</Button>
      </Popover.Trigger>
      <Popover.Content align="start">
        <p className="text-sm text-muted-foreground">
          This popover is left-aligned to its trigger via align=&quot;start&quot;.
        </p>
      </Popover.Content>
    </Popover>
  );
}

export const AlignedStart: Story = {
  parameters: {
    docs: {
      description: { story: 'Pass align="start" to left-align the floating panel to the trigger.' },
    },
  },
  render: () => <AlignedStartDemo />,
};
