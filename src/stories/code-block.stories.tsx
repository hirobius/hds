/**
 * CodeBlock stories — code display with copy button and collapsible toggle.
 * @see src/app/components/code-block.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "../app/components/code-block";

const SAMPLE_TS = `import { Button } from "@hds/button";

export function Demo() {
  return (
    <Button variant="primary" size="md">
      Click me
    </Button>
  );
}`;

const SAMPLE_JSON = `{
  "semantic.color.surface.raised": "#1e1e2e",
  "semantic.color.content.primary": "#cdd6f4",
  "semantic.radius.action": "6px"
}`;

const meta = {
  title: "Primitives/CodeBlock",
  component: CodeBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Code display block with copy affordance and optional collapsible toggle. Variants: block | inline. Supports regex-based syntax highlighting for ts, json, css, html.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["block", "inline"],
    },
    language: { control: "text" },
    filename: { control: "text" },
    collapsible: { control: "boolean" },
    defaultExpanded: { control: "boolean" },
    truncateFromStart: { control: "boolean" },
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Block: Story = {
  args: {
    code: SAMPLE_TS,
    variant: "block",
    language: "tsx",
    filename: "demo.tsx",
  },
};

export const BlockNoHeader: Story = {
  args: {
    code: SAMPLE_TS,
    variant: "block",
  },
};

export const JsonBlock: Story = {
  args: {
    code: SAMPLE_JSON,
    variant: "block",
    language: "json",
    filename: "tokens.json",
  },
};

export const Inline: Story = {
  args: {
    code: "pnpm manifest:generate",
    variant: "inline",
  },
};

export const InlineTruncateFromStart: Story = {
  args: {
    code: "var(--semantic-color-surface-accentSubtle)",
    variant: "inline",
    truncateFromStart: true,
  },
};

export const Collapsible: Story = {
  args: {
    code: SAMPLE_TS,
    variant: "block",
    language: "tsx",
    filename: "demo.tsx",
    collapsible: true,
    defaultExpanded: false,
  },
};

export const CollapsibleOpen: Story = {
  args: {
    code: SAMPLE_TS,
    variant: "block",
    language: "tsx",
    filename: "demo.tsx",
    collapsible: true,
    defaultExpanded: true,
  },
};
