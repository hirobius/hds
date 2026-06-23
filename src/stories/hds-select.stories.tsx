/**
 * HdsSelect stories — animated dropdown selector with keyboard navigation.
 * @see src/app/components/controls.tsx
 */
import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HdsSelect } from "../app/components/controls";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
];

const meta = {
  title: "Primitives/HdsSelect",
  component: HdsSelect,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Animated dropdown selector with keyboard navigation and stagger-animated option list. Controlled: pass value + onChange.",
      },
    },
  },
} satisfies Meta<typeof HdsSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("system");
    return (
      <div style={{ width: "220px" }}>
        <HdsSelect
          label="Theme"
          options={THEME_OPTIONS}
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const WithoutLabel: Story = {
  render: () => {
    const [value, setValue] = useState("en");
    return (
      <div style={{ width: "220px" }}>
        <HdsSelect
          label="Language"
          showLabel={false}
          options={LANG_OPTIONS}
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const ManyOptions: Story = {
  render: () => {
    const [value, setValue] = useState("en");
    return (
      <div style={{ width: "220px" }}>
        <HdsSelect
          label="Language"
          options={LANG_OPTIONS}
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};
