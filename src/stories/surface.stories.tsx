/* eslint-disable no-restricted-syntax */
/**
 * Surface stories — padding, shadow, and slot pattern demos.
 * @see src/app/components/surface.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Surface } from "../app/components/surface";
import { Text } from "../app/components/text";

const meta = {
  title: "Primitives/Surface",
  component: Surface,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Governed inset surface primitive. The only approved padded background-bearing wrapper in HDS. Enforces the Surface Inset rule: backgrounds MUST have internal padding. Use for card, panel, and inset content.",
      },
    },
  },
  argTypes: {
    padding: {
      control: { type: "select" },
      options: ["component", "item", "px16", "px24", "none"],
    },
    shadow: { control: "boolean" },
    theme: {
      control: { type: "select" },
      options: [undefined, "light", "dark"],
    },
  },
} satisfies Meta<typeof Surface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    padding: "component",
    children: <Text variant="body">Surface content with component padding.</Text>,
  },
};

export const ItemPadding: Story = {
  args: {
    padding: "item",
    children: <Text variant="ui">Compact item surface.</Text>,
  },
};

export const WithShadow: Story = {
  args: {
    shadow: true,
    children: (
      <Text variant="body">Elevated card with box-shadow lift.</Text>
    ),
  },
};

export const ForcedDark: Story = {
  args: {
    theme: "dark",
    padding: "component",
    children: (
      <Text variant="body">
        Forced dark theme surface regardless of context.
      </Text>
    ),
  },
};

export const CardGrid: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Grid of surfaces demonstrating padding and elevation variants.",
      },
    },
  },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", width: "100%" }}>
      <Surface>
        <Text variant="heading3">Default</Text>
        <Text variant="body">Component padding, no shadow.</Text>
      </Surface>
      <Surface padding="item">
        <Text variant="heading3">Item</Text>
        <Text variant="body">Compact 16px padding.</Text>
      </Surface>
      <Surface shadow>
        <Text variant="heading3">Elevated</Text>
        <Text variant="body">Elevation shadow lift.</Text>
      </Surface>
    </div>
  ),
};
