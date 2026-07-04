/**
 * HdsTooltip stories — accessible hover/focus tooltip.
 * @see src/app/components/hds-tooltip.tsx
 *
 * NOTE: Overlays stay CLOSED on mount. jsdom lacks pointer-capture so the
 * smoke gate cannot handle open Radix content. Do not set defaultOpen/open.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { HdsTooltip } from '../app/components/hds-tooltip';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/hds-tooltip',
  component: HdsTooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible hover/focus tooltip on Radix Tooltip. Collision-aware positioning, ARIA wiring, keyboard focus, and open delay out of the box. Inverse-surface bubble with arrow. Self-contained (Provider baked in). Compound API: HdsTooltip.Trigger / HdsTooltip.Content.',
      },
    },
  },
} satisfies Meta<typeof HdsTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default ──────────────────────────────────────────────────────────────────

function DefaultDemo() {
  return (
    <HdsTooltip>
      <HdsTooltip.Trigger asChild>
        <Button variant="secondary">Hover me</Button>
      </HdsTooltip.Trigger>
      <HdsTooltip.Content>Saved to your library</HdsTooltip.Content>
    </HdsTooltip>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

// ── Placement ─────────────────────────────────────────────────────────────────

function PlacementDemo() {
  return (
    <HdsTooltip>
      <HdsTooltip.Trigger asChild>
        <Button variant="tertiary" size="sm">Tip on the right</Button>
      </HdsTooltip.Trigger>
      <HdsTooltip.Content side="right">Opens beside the trigger</HdsTooltip.Content>
    </HdsTooltip>
  );
}

export const Placement: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Pass Radix `side` (top | right | bottom | left) to steer placement; positioning stays collision-aware.',
      },
    },
  },
  render: () => <PlacementDemo />,
};
