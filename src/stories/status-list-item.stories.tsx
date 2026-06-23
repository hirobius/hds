/**
 * StatusListItem stories — status dot + title row with notes and trailing slot.
 * @see src/app/components/status-list-item.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StatusListItem } from "../app/components/status-list-item";
import { Badge } from "../app/components/badge";

const meta = {
  title: "Patterns/StatusListItem",
  component: StatusListItem,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Status dot + title row with optional muted notes and trailing slot. Tones: success | warning | danger | info | neutral.",
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: "select" },
      options: ["success", "warning", "danger", "info", "neutral"],
    },
    title: { control: "text" },
  },
} satisfies Meta<typeof StatusListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tone: "neutral",
    title: "Token bridge running",
  },
};

export const Success: Story = {
  args: {
    tone: "success",
    title: "All tests passing",
    notes: ["182 passing, 0 failing"],
  },
};

export const Warning: Story = {
  args: {
    tone: "warning",
    title: "3 guardrail warnings",
    notes: ["check-validator-wiring", "check-manifest-drift"],
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    title: "Build failed",
    notes: ["TypeScript error in token.tsx line 42"],
  },
};

export const Info: Story = {
  args: {
    tone: "info",
    title: "Deployment in progress",
    notes: ["Vercel build triggered 2 minutes ago"],
  },
};

export const WithTrailing: Story = {
  args: {
    tone: "success",
    title: "Manifest up to date",
    trailing: <Badge>v2.4.1</Badge>,
  },
};

export const StatusList: Story = {
  parameters: {
    docs: {
      description: {
        story: "Multiple status items stacked — typical system health view.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>
      <StatusListItem tone="success" title="Token bridge" notes={["Connected on port 3001"]} />
      <StatusListItem tone="success" title="Manifest sync" notes={["Last sync 2 minutes ago"]} />
      <StatusListItem tone="warning" title="Storybook build" notes={["3 deprecation warnings"]} />
      <StatusListItem tone="danger" title="CI pipeline" notes={["2 checks failing"]} />
    </div>
  ),
};
