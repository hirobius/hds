/**
 * HdsHoverCard stories. Renders closed on mount (jsdom smoke-safe).
 * @see src/app/components/hds-hover-card.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsHoverCard } from '../app/components/hds-hover-card';

const meta = {
  title: 'Primitives/hds-hover-card',
  component: HdsHoverCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HdsHoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HdsHoverCard>
      <HdsHoverCard.Trigger asChild>
        <button type="button" className="underline">
          @ada
        </button>
      </HdsHoverCard.Trigger>
      <HdsHoverCard.Content>
        <p className="font-medium text-foreground">Ada Lovelace</p>
        <p className="mt-1 text-muted-foreground">
          Wrote the first algorithm intended for a machine.
        </p>
      </HdsHoverCard.Content>
    </HdsHoverCard>
  ),
};
