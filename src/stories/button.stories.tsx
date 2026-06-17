/**
 * Button stories — variant, size, state, and a11y demos.
 * @see src/app/components/button.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../app/components/button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Shared button primitive. cva-driven variants composed against role-token Tailwind utilities. Variants: primary | secondary | tertiary. Sizes: sm | md | lg.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "tertiary"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Variants ────────────────────────────────────────────────────────────────

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
};

export const Tertiary: Story = {
  args: {
    variant: "tertiary",
    children: "Tertiary Button",
  },
};

// ── Sizes ───────────────────────────────────────────────────────────────────

export const Small: Story = {
  args: {
    variant: "primary",
    size: "sm",
    children: "Small",
  },
};

export const Medium: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "Medium",
  },
};

export const Large: Story = {
  args: {
    variant: "primary",
    size: "lg",
    children: "Large",
  },
};

// ── States ──────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: {
    variant: "primary",
    loading: true,
    children: "Saving",
  },
};

export const Disabled: Story = {
  args: {
    variant: "primary",
    disabled: true,
    children: "Disabled",
  },
};

// ── A11y demo ───────────────────────────────────────────────────────────────

export const AllVariantsRow: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "All three variants at default size for side-by-side comparison.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
    </div>
  ),
};
