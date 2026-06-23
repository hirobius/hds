/**
 * Stat stories — headline metric with label and optional sub-line.
 * @see src/app/components/stat.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Stat } from "../app/components/stat";

const meta = {
  title: "Primitives/Stat",
  component: Stat,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Headline metric — large value, uppercase caption label, optional sub-line. Tones: default | success | warning | danger.",
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: "select" },
      options: ["default", "success", "warning", "danger"],
    },
    label: { control: "text" },
    value: { control: "text" },
    sub: { control: "text" },
  },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Components",
    value: "48",
  },
};

export const WithSub: Story = {
  args: {
    label: "Coverage",
    value: "94%",
    sub: "+3% since last release",
  },
};

export const SuccessTone: Story = {
  args: {
    label: "Tests passing",
    value: "182",
    tone: "success",
  },
};

export const WarningTone: Story = {
  args: {
    label: "Guardrail warnings",
    value: "3",
    tone: "warning",
  },
};

export const DangerTone: Story = {
  args: {
    label: "Type errors",
    value: "7",
    tone: "danger",
  },
};

export const StatRow: Story = {
  parameters: {
    docs: {
      description: {
        story: "Four metrics in a horizontal row — typical dashboard header usage.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
      <Stat label="Components" value="48" />
      <Stat label="Token paths" value="312" sub="36 primitive, 276 semantic" />
      <Stat label="Test coverage" value="94%" tone="success" />
      <Stat label="Open issues" value="2" tone="warning" />
    </div>
  ),
};
