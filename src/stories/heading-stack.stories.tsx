/**
 * HeadingStack stories — enforced vertical rhythm for heading + subheading pairs.
 * @see src/app/components/heading-stack.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { HeadingStack } from "../app/components/heading-stack";

const meta = {
  title: "Primitives/HeadingStack",
  component: HeadingStack,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Enforced vertical rhythm for heading + subheading pairs. Levels: heading1 | heading2 | heading3. Gap: px4 (tight) | px8 (default). Always use HeadingStack instead of manually stacking headings.",
      },
    },
  },
  argTypes: {
    level: {
      control: { type: "select" },
      options: ["heading1", "heading2", "heading3"],
    },
    gap: {
      control: { type: "select" },
      options: ["px4", "px8"],
    },
    heading: { control: "text" },
    subheading: { control: "text" },
  },
} satisfies Meta<typeof HeadingStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const H1: Story = {
  args: {
    level: "heading1",
    heading: "Hirobius Design System",
    subheading: "A token-first, closed-loop design system for Adrian's portfolio.",
  },
};

export const H2: Story = {
  args: {
    level: "heading2",
    heading: "Component Library",
    subheading: "48 published components across Primitives, Patterns, and Templates.",
  },
};

export const H3: Story = {
  args: {
    level: "heading3",
    heading: "Button",
    subheading: "Shared button primitive with CVA-driven variants.",
  },
};

export const TightGap: Story = {
  args: {
    level: "heading2",
    heading: "Section heading",
    subheading: "Supporting copy with a tighter 4px gap.",
    gap: "px4",
  },
};

export const AllLevels: Story = {
  parameters: {
    docs: {
      description: {
        story: "All three heading levels for comparison.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      <HeadingStack level="heading1" heading="Heading 1" subheading="Display-scale heading for hero sections." />
      <HeadingStack level="heading2" heading="Heading 2" subheading="Section-scale heading for page structure." />
      <HeadingStack level="heading3" heading="Heading 3" subheading="Subsection heading for card titles and docs." />
    </div>
  ),
};
