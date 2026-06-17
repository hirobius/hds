/**
 * Divider stories — orientation and weight demos.
 * @see src/app/components/Divider.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Divider } from "../app/components/divider";

const meta = {
  title: "Primitives/divider",
  component: Divider,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Semantic separator between content regions. Uses the semantic border token for automatic dark/light adaptation. Horizontal by default; vertical for inline separation.",
      },
    },
  },
  argTypes: {
    orientation: {
      control: { type: "radio" },
      options: ["horizontal", "vertical"],
    },
    strong: { control: "boolean" },
    spacing: { control: "text" },
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { orientation: "horizontal" },
};

export const HorizontalStrong: Story = {
  args: { orientation: "horizontal", strong: true },
};

export const WithSpacing: Story = {
  args: { orientation: "horizontal", spacing: "16px" },
};

export const Vertical: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", height: "40px" }}>
      <span>Left</span>
      <Divider orientation="vertical" />
      <span>Right</span>
    </div>
  ),
};

export const BetweenSections: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Divider used between content sections to create visual rhythm.",
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: "480px" }}>
      <p style={{ margin: 0 }}>Section one content.</p>
      <Divider spacing="16px" />
      <p style={{ margin: 0 }}>Section two content.</p>
      <Divider spacing="16px" strong />
      <p style={{ margin: 0 }}>Section three content (strong separator above).</p>
    </div>
  ),
};
