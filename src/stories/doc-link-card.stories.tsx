/**
 * DocLinkCard stories — navigation card for editorial and documentation cross-links.
 * @see src/app/components/doc-link-card.tsx
 *
 * DocLinkCard uses useNavigate from react-router, so all stories are wrapped
 * in MemoryRouter.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { BookOpen, ArrowRight, Layers } from "lucide-react";
import { DocLinkCard } from "../app/components/doc-link-card";

const meta = {
  title: "Primitives/DocLinkCard",
  component: DocLinkCard,
  tags: ["autodocs"],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Navigation card for editorial and documentation cross-links. Variants: feature | pager. Supports accent tint and up-right | right | left affordance.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["feature", "pager"],
    },
    affordance: {
      control: { type: "select" },
      options: ["up-right", "right", "left"],
    },
    accent: { control: "boolean" },
    disabled: { control: "boolean" },
    metaStyle: {
      control: { type: "select" },
      options: ["caption", "ui"],
    },
  },
} satisfies Meta<typeof DocLinkCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Feature: Story = {
  args: {
    title: "Component Library",
    description: "Browse all 48 published HDS components with live previews and prop tables.",
    href: "/components",
    icon: BookOpen,
    variant: "feature",
  },
};

export const FeatureWithMeta: Story = {
  args: {
    title: "Design Tokens",
    description: "Explore primitive, semantic, and component-level token paths.",
    href: "/tokens",
    icon: Layers,
    meta: "Reference",
    variant: "feature",
  },
};

export const FeatureAccent: Story = {
  args: {
    title: "Getting Started",
    description: "Install HDS and wire up the token bridge in five minutes.",
    href: "/getting-started",
    icon: ArrowRight,
    variant: "feature",
    accent: true,
  },
};

export const Pager: Story = {
  args: {
    title: "Next: Patterns",
    href: "/patterns",
    icon: ArrowRight,
    variant: "pager",
    affordance: "right",
  },
};

export const PagerLeft: Story = {
  args: {
    title: "Back: Primitives",
    href: "/primitives",
    icon: ArrowRight,
    variant: "pager",
    affordance: "left",
  },
};

export const Disabled: Story = {
  args: {
    title: "Coming Soon",
    description: "This section is under construction.",
    href: "/soon",
    icon: BookOpen,
    variant: "feature",
    disabled: true,
  },
};

export const Grid: Story = {
  parameters: {
    docs: {
      description: {
        story: "Two feature cards in a two-column grid.",
      },
    },
  },
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "640px" }}>
      <DocLinkCard
        title="Primitives"
        description="Atomic building blocks: Button, Badge, Input and more."
        href="/primitives"
        icon={Layers}
      />
      <DocLinkCard
        title="Patterns"
        description="Composed UI patterns: NavGroup, Disclosure, Sketch."
        href="/patterns"
        icon={BookOpen}
      />
    </div>
  ),
};
