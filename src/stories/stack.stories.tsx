/**
 * Stack stories — direction, gap, align, and justify demos.
 * @see src/app/components/Stack.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Stack } from "../app/components/stack";

const Swatch = ({ label }: { label: string }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: "var(--semantic-color-surface-raised, #e5e7eb)",
      border: "1px solid var(--semantic-color-border-default, #d1d5db)",
      borderRadius: "6px",
      padding: "8px 16px",
      fontSize: "12px",
      color: "var(--semantic-color-content-secondary, #6b7280)",
    }}
  >
    {label}
  </div>
);

const meta = {
  title: "Primitives/stack",
  component: Stack,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "One-dimensional layout primitive. Thin flex wrapper that enforces gap values from the HDS space scale. Use for flow spacing and simple flex alignment only.",
      },
    },
  },
  argTypes: {
    direction: {
      control: { type: "radio" },
      options: ["row", "column"],
    },
    gap: {
      control: { type: "select" },
      options: ["tight", "normal", "inset", "spacious", "gap", "medium"],
    },
    align: {
      control: { type: "select" },
      options: ["start", "center", "end", "stretch"],
    },
    justify: {
      control: { type: "select" },
      options: ["start", "center", "end", "space-between"],
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Column: Story = {
  args: { direction: "column", gap: "normal" },
  render: (args) => (
    <Stack {...args}>
      <Swatch label="Item A" />
      <Swatch label="Item B" />
      <Swatch label="Item C" />
    </Stack>
  ),
};

export const Row: Story = {
  args: { direction: "row", gap: "normal" },
  render: (args) => (
    <Stack {...args}>
      <Swatch label="Item A" />
      <Swatch label="Item B" />
      <Swatch label="Item C" />
    </Stack>
  ),
};

export const SpaceBetween: Story = {
  args: { direction: "row", gap: "normal", justify: "space-between" },
  render: (args) => (
    <Stack {...args} style={{ width: "100%" }}>
      <Swatch label="Left" />
      <Swatch label="Right" />
    </Stack>
  ),
};

export const TightGap: Story = {
  args: { direction: "column", gap: "tight" },
  render: (args) => (
    <Stack {...args}>
      <Swatch label="Tight A" />
      <Swatch label="Tight B" />
      <Swatch label="Tight C" />
    </Stack>
  ),
};

export const SpaciousGap: Story = {
  args: { direction: "column", gap: "spacious" },
  render: (args) => (
    <Stack {...args}>
      <Swatch label="Spacious A" />
      <Swatch label="Spacious B" />
    </Stack>
  ),
};
