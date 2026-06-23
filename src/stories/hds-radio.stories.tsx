/**
 * HdsRadio stories — radio button with animated selection indicator.
 * @see src/app/components/controls.tsx
 */
import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HdsRadio } from "../app/components/controls";

const meta = {
  title: "Primitives/HdsRadio",
  component: HdsRadio,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Radio button with animated selection indicator. Controlled: pass checked + onChange.",
      },
    },
  },
} satisfies Meta<typeof HdsRadio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return <HdsRadio label="Option A" checked={checked} onChange={setChecked} />;
  },
};

export const Checked: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return <HdsRadio label="Option B (selected)" checked={checked} onChange={setChecked} />;
  },
};

export const RadioGroup: Story = {
  parameters: {
    docs: {
      description: {
        story: "Simulated radio group — only one option selected at a time.",
      },
    },
  },
  render: () => {
    const OPTIONS = ["Light", "Dark", "System"] as const;
    const [selected, setSelected] = useState<string>("System");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {OPTIONS.map((opt) => (
          <HdsRadio
            key={opt}
            label={opt}
            checked={selected === opt}
            onChange={() => setSelected(opt)}
          />
        ))}
      </div>
    );
  },
};
