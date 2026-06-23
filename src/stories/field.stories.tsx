/**
 * Field stories — caption label paired with a value for metadata grids.
 * @see src/app/components/field.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Field } from "../app/components/field";

const meta = {
  title: "Primitives/Field",
  component: Field,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Caption label paired with a value. Used in metadata grids and read-only forms. Tones: default | success | warning | danger.",
      },
    },
  },
  argTypes: {
    tone: {
      control: { type: "select" },
      options: ["default", "success", "warning", "danger"],
    },
    mono: { control: "boolean" },
    label: { control: "text" },
    value: { control: "text" },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Component",
    value: "Button",
  },
};

export const MonoValue: Story = {
  args: {
    label: "Token path",
    value: "semantic.color.content.primary",
    mono: true,
  },
};

export const SuccessTone: Story = {
  args: {
    label: "Status",
    value: "Published",
    tone: "success",
  },
};

export const WarningTone: Story = {
  args: {
    label: "Status",
    value: "Needs review",
    tone: "warning",
  },
};

export const DangerTone: Story = {
  args: {
    label: "Status",
    value: "Deprecated",
    tone: "danger",
  },
};

export const MetadataGrid: Story = {
  parameters: {
    docs: {
      description: {
        story: "Multiple fields in a horizontal metadata grid layout.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
      <Field label="Tier" value="Primitive" />
      <Field label="Category" value="Inputs" />
      <Field label="Status" value="Stable" tone="success" />
      <Field label="Token path" value="component.button.paddingX" mono />
    </div>
  ),
};
