/**
 * StackedCardRail stories — horizontally-scrolling stacked card carousel.
 * @see src/app/components/stacked-card-rail.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StackedCardRail } from "../app/components/stacked-card-rail";

const CARDS = [
  { id: "c1", title: "Brand Identity System", category: "Branding" },
  { id: "c2", title: "E-Commerce Checkout Flow", category: "Product Design" },
  { id: "c3", title: "Design System v2", category: "Systems" },
  { id: "c4", title: "Mobile Navigation Patterns", category: "Mobile" },
  { id: "c5", title: "Data Visualisation Dashboard", category: "Data" },
  { id: "c6", title: "Onboarding Experience", category: "Product Design" },
];

const meta = {
  title: "Patterns/StackedCardRail",
  component: StackedCardRail,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Horizontally-scrolling stacked card carousel. Vertical scroll maps to horizontal scroll; CSS scroll-driven animation handles the stack/unstack effect where supported.",
      },
    },
  },
} satisfies Meta<typeof StackedCardRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cards: CARDS,
  },
  decorators: [
    (Story) => (
      <div style={{ height: "600px", overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
};

export const FewCards: Story = {
  args: {
    cards: CARDS.slice(0, 3),
  },
  decorators: [
    (Story) => (
      <div style={{ height: "600px", overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
};
