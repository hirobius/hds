/**
 * Alert stories — variant and title demos.
 * @see src/app/components/Alert.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Alert } from "../app/components/alert";

const meta = {
  title: "Primitives/alert",
  component: Alert,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Compact feedback surface with contextual severity. Variants: success | error | warning | info. Non-blocking status messages; use Dialog for blocking responses.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["success", "error", "warning", "info"],
    },
    title: { control: "text" },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: "info",
    children: "Your account settings have been updated.",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    children: "Component exported successfully.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "This action cannot be undone.",
  },
};

export const Error: Story = {
  args: {
    variant: "error",
    children: "Failed to connect to the token bridge.",
  },
};

export const WithTitle: Story = {
  args: {
    variant: "error",
    title: "Export Failed",
    children: "The Figma plugin could not export this token batch. Check your API key.",
  },
};

export const AllVariants: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "All four severity variants stacked.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>
      <Alert variant="info">Informational message for context.</Alert>
      <Alert variant="success">Operation completed successfully.</Alert>
      <Alert variant="warning">Review before proceeding.</Alert>
      <Alert variant="error">Something went wrong. Please retry.</Alert>
    </div>
  ),
};
