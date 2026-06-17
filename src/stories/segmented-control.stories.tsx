/**
 * SegmentedControl stories — variant, size, and controlled demos.
 * @see src/app/components/SegmentedControl.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { SegmentedControl } from "../app/components/segmented-control";

const VIEW_OPTIONS = [
  { value: "list", label: "List" },
  { value: "grid", label: "Grid" },
  { value: "table", label: "Table" },
];

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const meta = {
  title: "Primitives/segmented-control",
  component: SegmentedControl,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Segmented selection input for compact mutually-exclusive choices. Variants: primary | secondary. Sizes: default | compact. Supports full-width layout.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "radio" },
      options: ["primary", "secondary"],
    },
    size: {
      control: { type: "radio" },
      options: ["default", "compact"],
    },
    fullWidth: { control: "boolean" },
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

function PrimaryRender() {
  const [value, setValue] = useState("list");
  return (
    <SegmentedControl
      label="View"
      options={VIEW_OPTIONS}
      value={value}
      onChange={setValue}
      variant="primary"
    />
  );
}

export const Primary: Story = {
  render: () => <PrimaryRender />,
};

function SecondaryRender() {
  const [value, setValue] = useState("system");
  return (
    <SegmentedControl
      label="Theme"
      options={THEME_OPTIONS}
      value={value}
      onChange={setValue}
      variant="secondary"
    />
  );
}

export const Secondary: Story = {
  render: () => <SecondaryRender />,
};

function CompactRender() {
  const [value, setValue] = useState("list");
  return (
    <SegmentedControl
      ariaLabel="View mode"
      options={VIEW_OPTIONS}
      value={value}
      onChange={setValue}
      size="compact"
    />
  );
}

export const Compact: Story = {
  render: () => <CompactRender />,
};

function FullWidthRender() {
  const [value, setValue] = useState("system");
  return (
    <div style={{ width: "360px" }}>
      <SegmentedControl
        label="Theme preference"
        options={THEME_OPTIONS}
        value={value}
        onChange={setValue}
        fullWidth
      />
    </div>
  );
}

export const FullWidth: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Full-width segmented control stretches to the container width.",
      },
    },
  },
  render: () => <FullWidthRender />,
};
