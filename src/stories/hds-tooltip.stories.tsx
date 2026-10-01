/**
 * Tooltip stories — accessible hover/focus tooltip.
 * @see src/app/components/hds-tooltip.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle open Radix content. Do not set defaultOpen/open.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Tooltip } from '../app/components/hds-tooltip';
import { Button } from '../app/components/button';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Primitives/HDS Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('Tooltip'),
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible hover/focus tooltip on Radix Tooltip. Collision-aware positioning, ARIA wiring, keyboard focus, and open delay out of the box. Inverse-surface bubble with arrow. Self-contained (Provider baked in). Compound API: Tooltip.Trigger / Tooltip.Content.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default ──────────────────────────────────────────────────────────────────

function DefaultDemo() {
  return (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Button variant="secondary">Hover me</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Saved to your library</Tooltip.Content>
    </Tooltip>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

// ── Placement ─────────────────────────────────────────────────────────────────

function PlacementDemo() {
  return (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Button variant="tertiary" size="sm">
          Tip on the right
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content side="right">Opens beside the trigger</Tooltip.Content>
    </Tooltip>
  );
}

export const Placement: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Pass Radix `side` (top | right | bottom | left) to steer placement; positioning stays collision-aware.',
      },
    },
  },
  render: () => <PlacementDemo />,
};
