/**
 * TextLockup stories — size and alignment demos.
 * @see src/app/components/TextLockup.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { TextLockup } from "../app/components/text-lockup";

const meta = {
  title: "Primitives/text-lockup",
  component: TextLockup,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Governed title-and-description pairing primitive. Sizes: hero | heroXl | section | metric | detail | numbered. Use for semantic title lockups with optional eyebrow and supporting copy.",
      },
    },
  },
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["hero", "heroXl", "section", "metric", "detail", "numbered"],
    },
    align: {
      control: { type: "radio" },
      options: ["left", "center"],
    },
  },
} satisfies Meta<typeof TextLockup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = {
  args: {
    size: "hero",
    title: "Hirobius Design System",
    description:
      "Token-governed React primitives for consistent, accessible interfaces.",
  },
};

export const Section: Story = {
  args: {
    size: "section",
    title: "Component Library",
    description: "29 primitives for building production-quality interfaces.",
  },
};

export const WithEyebrow: Story = {
  args: {
    size: "section",
    eyebrow: "Phase 12 · HDS Refinement",
    title: "Public API Surface",
    description: "Storybook 8 setup for isolated component renders.",
  },
};

export const Detail: Story = {
  args: {
    size: "detail",
    title: "Button",
    description: "cva-driven button primitive with three variants and three sizes.",
  },
};

export const Centered: Story = {
  args: {
    size: "section",
    align: "center",
    title: "Centered lockup",
    description: "Hero banners and marketing sections use center alignment.",
  },
};

export const Numbered: Story = {
  parameters: {
    docs: {
      description: {
        story: "Numbered size for ordered doc sections with anchor affordances.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px" }}>
      <TextLockup
        size="numbered"
        id="step-1"
        title="Install dependencies"
        description="Run pnpm install to bootstrap the design system."
      />
      <TextLockup
        size="numbered"
        id="step-2"
        title="Generate tokens"
        description="Run pnpm tokens to build the CSS custom property output."
      />
    </div>
  ),
};
