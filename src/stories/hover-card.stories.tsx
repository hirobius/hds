/**
 * HoverCard stories. Renders closed on mount (jsdom smoke-safe).
 * @see src/app/components/hover-card.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HoverCard } from '../app/components/hover-card';

const meta = {
  title: 'Primitives/hover-card',
  component: HoverCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCard.Trigger asChild>
        <button type="button" className="underline">
          @ada
        </button>
      </HoverCard.Trigger>
      <HoverCard.Content>
        <p className="font-medium text-foreground">Ada Lovelace</p>
        <p className="mt-1 text-muted-foreground">
          Wrote the first algorithm intended for a machine.
        </p>
      </HoverCard.Content>
    </HoverCard>
  ),
};
