/**
 * EmptyState stories — consistent no-data placeholder.
 * @see src/app/components/empty-state.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "../app/components/empty-state";

const meta = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Inline empty-state placeholder for lists, grids, and sections. Typographic message only — do not wrap in Surface or Card.",
      },
    },
  },
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "No components yet",
  },
};

export const WithDescription: Story = {
  args: {
    title: "No search results",
    description: "Try a different keyword or clear the active filters.",
  },
};

export const InContext: Story = {
  parameters: {
    docs: {
      description: {
        story: "EmptyState inside a bordered container to show inline placement.",
      },
    },
  },
  render: () => (
    <div
      style={{
        border: "1px solid var(--semantic-color-border-default, #333)",
        borderRadius: "8px",
        padding: "32px",
        maxWidth: "400px",
      }}
    >
      <EmptyState
        title="No tokens found"
        description="Add your first token to get started."
      />
    </div>
  ),
};
