/**
 * Callout stories — tone-driven side-rule callout.
 * @see src/app/components/callout.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Callout } from "../app/components/callout";

const meta = {
  title: "Primitives/Callout",
  component: Callout,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Tone-driven side-rule callout for status, quotes, and hypotheses. Tones: accent | info | success | warning | danger.",
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: "select" },
      options: ["accent", "info", "success", "warning", "danger"],
    },
    italic: { control: "boolean" },
  },
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    tone: "info",
    children: "This feature is in beta. Behaviour may change before the stable release.",
  },
};

export const Success: Story = {
  args: {
    tone: "success",
    children: "Tokens exported successfully to the Figma library.",
  },
};

export const Warning: Story = {
  args: {
    tone: "warning",
    children: "Changing this value will invalidate all derived semantic tokens.",
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    children: "Deleting this component removes it from all published libraries.",
  },
};

export const Accent: Story = {
  args: {
    tone: "accent",
    children: "Design decisions here follow the Swiss-grid canon: constraint breeds clarity.",
  },
};

export const QuotePullOut: Story = {
  args: {
    tone: "accent",
    italic: true,
    children:
      "Good design is as little design as possible. Less, but better — because it concentrates on the essential aspects.",
  },
};

export const AllTones: Story = {
  parameters: {
    docs: {
      description: {
        story: "All five tones stacked for comparison.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "540px" }}>
      <Callout tone="accent">Accent callout — editorial or brand-level note.</Callout>
      <Callout tone="info">Info callout — contextual guidance.</Callout>
      <Callout tone="success">Success callout — operation completed.</Callout>
      <Callout tone="warning">Warning callout — proceed with caution.</Callout>
      <Callout tone="danger">Danger callout — destructive or irreversible action.</Callout>
    </div>
  ),
};
