/**
 * HdsTooltip stories — sides, delay, and rich-content demos.
 * @see src/app/components/hds-tooltip.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsTooltip } from '../app/components/hds-tooltip';
import { Button } from '../app/components/button';

const meta = {
  title: 'Overlays/hds-tooltip',
  component: HdsTooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible hover/focus tooltip on Radix. Inverse bubble (foreground surface), collision-aware, role="tooltip" + aria-describedby wired. Sides: top | right | bottom | left.',
      },
    },
  },
  argTypes: {
    side: { control: { type: 'radio' }, options: ['top', 'right', 'bottom', 'left'] },
    align: { control: { type: 'radio' }, options: ['start', 'center', 'end'] },
    delayDuration: { control: 'number' },
    content: { control: 'text' },
  },
} satisfies Meta<typeof HdsTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: 'Copy to clipboard',
    children: <Button>Hover or focus me</Button>,
  },
};

export const Sides: Story = {
  parameters: {
    docs: { description: { story: 'The tooltip anchors to any side of its trigger.' } },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '24px' }}>
      <HdsTooltip content="Top" side="top">
        <Button>Top</Button>
      </HdsTooltip>
      <HdsTooltip content="Right" side="right">
        <Button>Right</Button>
      </HdsTooltip>
      <HdsTooltip content="Bottom" side="bottom">
        <Button>Bottom</Button>
      </HdsTooltip>
      <HdsTooltip content="Left" side="left">
        <Button>Left</Button>
      </HdsTooltip>
    </div>
  ),
};

