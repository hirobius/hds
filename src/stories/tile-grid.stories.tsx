/**
 * TileGrid stories — auto-fill responsive grid for status/micro tiles.
 * @see src/app/components/tile-grid.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { TileGrid } from "../app/components/tile-grid";
import { StatusTile } from "../app/components/status-tile";
import { Badge } from "../app/components/badge";

const meta = {
  title: "Primitives/TileGrid",
  component: TileGrid,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Auto-fill responsive grid for status/micro tiles. Wraps children in a one-line grid declaration so pages avoid repeating the auto-fill minmax recipe.",
      },
    },
  },
  argTypes: {
    gap: {
      control: { type: "select" },
      options: ["xs", "sm", "md"],
    },
    minTileWidth: { control: "text" },
  },
} satisfies Meta<typeof TileGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    minTileWidth: "220px",
    gap: "sm",
  },
  render: (args) => (
    <TileGrid {...args}>
      <StatusTile tone="success" title="Token bridge" notes={["Port 3001"]} trailing={<Badge>Up</Badge>} />
      <StatusTile tone="success" title="Manifest sync" notes={["In sync"]} trailing={<Badge>OK</Badge>} />
      <StatusTile tone="warning" title="Storybook" notes={["3 warnings"]} trailing={<Badge>Warn</Badge>} />
      <StatusTile tone="danger" title="CI pipeline" notes={["2 failing"]} trailing={<Badge>Fail</Badge>} />
    </TileGrid>
  ),
};

export const WideTiles: Story = {
  args: {
    minTileWidth: "300px",
    gap: "md",
  },
  render: (args) => (
    <TileGrid {...args}>
      {Array.from({ length: 6 }, (_, i) => (
        <StatusTile key={i} tone="neutral" title={`Metric ${i + 1}`} notes={[`Value ${(i + 1) * 12}`]} />
      ))}
    </TileGrid>
  ),
};

export const NarrowTiles: Story = {
  args: {
    minTileWidth: "160px",
    gap: "xs",
  },
  render: (args) => (
    <TileGrid {...args}>
      {Array.from({ length: 8 }, (_, i) => (
        <StatusTile key={i} tone="neutral" title={`Item ${i + 1}`} />
      ))}
    </TileGrid>
  ),
};
