/**
 * StepperField stories — numeric input with decrement/increment controls.
 * @see src/app/components/stepper-field.tsx
 */
import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { StepperField } from "../app/components/stepper-field";

const meta = {
  title: "Patterns/StepperField",
  component: StepperField,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Numeric input with decrement/increment controls. Controlled: pass value + onChange. Supports fractional steps and clamped min/max range.",
      },
    },
  },
} satisfies Meta<typeof StepperField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(4);
    return (
      <div style={{ width: "240px" }}>
        <StepperField
          label="Column count"
          value={value}
          min={1}
          max={12}
          step={1}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const DecimalStep: Story = {
  render: () => {
    const [value, setValue] = useState(1.5);
    return (
      <div style={{ width: "240px" }}>
        <StepperField
          label="Border radius (rem)"
          value={value}
          min={0}
          max={4}
          step={0.25}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const LargeRange: Story = {
  render: () => {
    const [value, setValue] = useState(400);
    return (
      <div style={{ width: "240px" }}>
        <StepperField
          label="Canvas width (px)"
          value={value}
          min={320}
          max={1440}
          step={8}
          onChange={setValue}
        />
      </div>
    );
  },
};
