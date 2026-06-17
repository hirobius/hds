/**
 * Card stories — compound anatomy, padding variants, and a11y demos.
 * @see src/app/components/Card.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "../app/components/card";

const meta = {
  title: "Primitives/card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Surface container (shadcn baseline) with compound anatomy parts. Use Card.Header / Card.Title / Card.Description / Card.Body / Card.Footer for structured content. Pass padding='none' on the root when using parts. Legacy padding props are retained for backward-compatible flat-children usage.",
      },
    },
  },
  argTypes: {
    padding: {
      control: { type: "select" },
      options: ["component", "item", "px24", "px16", "none"],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Flat children (legacy API) ──────────────────────────────────────────────

export const Default: Story = {
  args: {
    children: "Simple card with flat children and default component padding.",
    style: { maxWidth: 360 },
  },
};

// ── Compound anatomy ─────────────────────────────────────────────────────────

export const FullAnatomy: Story = {
  parameters: {
    docs: {
      description: {
        story: "Full compound anatomy: Header → Title + Description → Body → Footer.",
      },
    },
  },
  render: () => (
    <Card padding="none" style={{ maxWidth: 360 }}>
      <Card.Header>
        <Card.Title>Design Tokens</Card.Title>
        <Card.Description>
          Semantic color and spacing tokens for the HDS.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <p style={{ margin: 0, fontSize: "14px" }}>
          Tokens are sourced from <code>hirobius.tokens.json</code> and
          published to Figma variables on every sync.
        </p>
      </Card.Body>
      <Card.Footer>
        <span style={{ fontSize: "12px", opacity: 0.6 }}>Last sync: today</span>
      </Card.Footer>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card padding="none" style={{ maxWidth: 360 }}>
      <Card.Header>
        <Card.Title>Token Explorer</Card.Title>
        <Card.Description>Browse all 400+ design tokens.</Card.Description>
      </Card.Header>
      <Card.Body>
        <p style={{ margin: 0, fontSize: "14px" }}>
          Filter by primitive, semantic, or component tier.
        </p>
      </Card.Body>
    </Card>
  ),
};

// ── Padding variants ─────────────────────────────────────────────────────────

export const PaddingVariants: Story = {
  parameters: {
    docs: {
      description: {
        story: "All padding tiers: component (24px) | item (16px) | px24 | px16 | none.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: 360 }}>
      {(["component", "item", "px16", "none"] as const).map((padding) => (
        <Card key={padding} padding={padding}>
          <p style={{ margin: 0, fontSize: "13px" }}>padding=&quot;{padding}&quot;</p>
        </Card>
      ))}
    </div>
  ),
};

// ── Elevated card ────────────────────────────────────────────────────────────

export const Elevated: Story = {
  parameters: {
    docs: {
      description: {
        story: "shadow-md class adds a two-layer elevation treatment for interactive or floating cards.",
      },
    },
  },
  render: () => (
    <Card className="shadow-md" style={{ maxWidth: 360 }}>
      <p style={{ margin: 0, fontSize: "14px" }}>
        Elevated card — use for modals, popovers, or highlighted content surfaces.
      </p>
    </Card>
  ),
};
