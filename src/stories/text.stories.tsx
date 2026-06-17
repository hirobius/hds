/**
 * Text stories — typographic variant ramp demos.
 * @see src/app/components/Text.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "../app/components/text";

const meta = {
  title: "Primitives/text",
  component: Text,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Token-bound typographic primitive. Maps 13 named variants (display → docCode) onto the 8-style Swiss-canon composite ramp via design tokens. All font metrics resolve from CSS custom properties.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: [
        "display",
        "heading1",
        "heading2",
        "heading3",
        "body",
        "ui",
        "caption",
        "technical",
        "badge",
        "docLede",
        "docBody",
        "docSmall",
        "docCode",
      ],
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Display: Story = {
  args: { variant: "display", children: "Display Heading" },
};

export const Heading1: Story = {
  args: { variant: "heading1", children: "Heading 1" },
};

export const Heading2: Story = {
  args: { variant: "heading2", children: "Heading 2" },
};

export const Heading3: Story = {
  args: { variant: "heading3", children: "Heading 3" },
};

export const Body: Story = {
  args: {
    variant: "body",
    children:
      "Body text for paragraphs, descriptions, and flowing prose content.",
  },
};

export const UI: Story = {
  args: {
    variant: "ui",
    children: "UI label text for controls and metadata.",
  },
};

export const Caption: Story = {
  args: { variant: "caption", children: "Caption for supporting metadata." },
};

export const Technical: Story = {
  args: { variant: "technical", children: "technical.token.path" },
};

export const FullRamp: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "All typographic variants stacked to verify the full ramp.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Text variant="display">Display</Text>
      <Text variant="heading1">Heading 1</Text>
      <Text variant="heading2">Heading 2</Text>
      <Text variant="heading3">Heading 3</Text>
      <Text variant="body">Body — flowing prose and paragraph copy.</Text>
      <Text variant="ui">UI — labels and control text.</Text>
      <Text variant="caption">Caption — supporting metadata.</Text>
      <Text variant="technical">technical.token.path</Text>
      <Text variant="badge">BADGE</Text>
    </div>
  ),
};
