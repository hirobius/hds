/**
 * InlineCode stories — compact, copyable, and prose demos.
 * @see src/app/components/InlineCode.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { InlineCode } from "../app/components/inline-code";
import { Text } from "../app/components/text";

const meta = {
  title: "Primitives/inline-code",
  component: InlineCode,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Inline code chip for token paths, file paths, and code-adjacent prose. Compact mode for dense body copy and tables. Copyable mode adds a copy-to-clipboard button (children must be a string).",
      },
    },
  },
  argTypes: {
    compact: { control: "boolean" },
    copyable: { control: "boolean" },
  },
} satisfies Meta<typeof InlineCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "semantic.color.brand.primary",
  },
};

export const Compact: Story = {
  args: {
    compact: true,
    children: "src/app/components/Button.tsx",
  },
};

export const Copyable: Story = {
  args: {
    copyable: true,
    children: "var(--semantic-color-brand-primary)",
  },
};

export const InProse: Story = {
  parameters: {
    docs: {
      description: {
        story: "InlineCode embedded within body text.",
      },
    },
  },
  render: () => (
    <Text variant="body">
      Use the <InlineCode>variant</InlineCode> prop to select{" "}
      <InlineCode>primary</InlineCode>,{" "}
      <InlineCode>secondary</InlineCode>, or{" "}
      <InlineCode>tertiary</InlineCode> visual treatments.
    </Text>
  ),
};

export const CopyableInProse: Story = {
  parameters: {
    docs: {
      description: {
        story: "Copyable variant for token paths in documentation.",
      },
    },
  },
  render: () => (
    <Text variant="body">
      The brand primary token path is{" "}
      <InlineCode copyable>semantic.color.brand.primary</InlineCode>.
    </Text>
  ),
};
