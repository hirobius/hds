/**
 * StatusTile stories — block-layout status surface with title, notes, and trailing slot.
 * @see src/app/components/status-tile.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StatusTile } from "../app/components/status-tile";
import { Badge } from "../app/components/badge";

const meta = {
  title: "Patterns/StatusTile",
  component: StatusTile,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Block-layout sibling of StatusListItem. Raised surface tile with title, optional muted notes, and a trailing slot. Tone belongs in the trailing slot.",
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
} satisfies Meta<typeof StatusTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tone: "neutral",
    title: "Token bridge",
    notes: ["Running on port 3001"],
  },
};

export const WithTrailingBadge: Story = {
  args: {
    tone: "success",
    title: "All checks passing",
    notes: ["182 tests, 0 failures"],
    trailing: <Badge>Stable</Badge>,
  },
};

export const Warning: Story = {
  args: {
    tone: "warning",
    title: "Guardrail drift",
    notes: ["2 validators not wired", "Run pnpm check:registry to fix"],
    trailing: <Badge>Warning</Badge>,
  },
};

export const TileGrid: Story = {
  parameters: {
    docs: {
      description: {
        story: "Four status tiles in a responsive auto-fill grid.",
      },
    },
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "12px",
      }}
    >
      <StatusTile tone="success" title="Token bridge" notes={["Port 3001"]} trailing={<Badge>Up</Badge>} />
      <StatusTile tone="success" title="Manifest" notes={["In sync"]} trailing={<Badge>OK</Badge>} />
      <StatusTile tone="warning" title="Storybook" notes={["3 warnings"]} trailing={<Badge>Warn</Badge>} />
      <StatusTile tone="danger" title="CI pipeline" notes={["2 failing"]} trailing={<Badge>Fail</Badge>} />
    </div>
  ),
};
