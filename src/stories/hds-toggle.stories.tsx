/**
 * HdsToggle stories — boolean on/off toggle with animated thumb.
 * @see src/app/components/controls.tsx
 */
import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HdsToggle } from "../app/components/controls";

const meta = {
  title: "Primitives/HdsToggle",
  component: HdsToggle,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Boolean on/off toggle with animated thumb. Controlled: pass checked + onChange.",
      },
    },
  },
} satisfies Meta<typeof HdsToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return <HdsToggle label="Enable dark mode" checked={checked} onChange={setChecked} />;
  },
};

export const Checked: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return <HdsToggle label="Show grid overlay" checked={checked} onChange={setChecked} />;
  },
};

export const MultipleToggles: Story = {
  parameters: {
    docs: {
      description: {
        story: "Multiple toggles in a group.",
      },
    },
  },
  render: () => {
    const [grid, setGrid] = useState(true);
    const [rulers, setRulers] = useState(false);
    const [snap, setSnap] = useState(true);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <HdsToggle label="Show grid" checked={grid} onChange={setGrid} />
        <HdsToggle label="Show rulers" checked={rulers} onChange={setRulers} />
        <HdsToggle label="Snap to grid" checked={snap} onChange={setSnap} />
      </div>
    );
  },
};
