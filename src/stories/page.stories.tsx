/**
 * Page stories — standard page shell with Container and vertical padding.
 * @see src/app/components/page.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Page } from "../app/components/page";

const meta = {
  title: "Primitives/Page",
  component: Page,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Standard page shell. Wraps content in Container (width constraint) and applies canonical vertical padding. maxWidth: 'content' (760px prose) | 'max' (1200px). paddingY: 'default' | 'compact' | 'none'.",
      },
    },
  },
  argTypes: {
    maxWidth: {
      control: { type: "select" },
      options: ["content", "max"],
    },
    paddingY: {
      control: { type: "select" },
      options: ["default", "compact", "none"],
    },
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div style={{ background: "var(--semantic-color-surface-raised, #1e1e2e)", padding: "24px", borderRadius: "8px" }}>
        <p style={{ margin: 0, color: "var(--semantic-color-content-primary, #cdd6f4)" }}>
          Page content — constrained to the max layout width with canonical vertical padding.
        </p>
      </div>
    ),
  },
};

export const ProseWidth: Story = {
  args: {
    maxWidth: "content",
    children: (
      <div style={{ background: "var(--semantic-color-surface-raised, #1e1e2e)", padding: "24px", borderRadius: "8px" }}>
        <p style={{ margin: 0, color: "var(--semantic-color-content-primary, #cdd6f4)" }}>
          Prose-width content constrained to 760px — ideal for long-form articles and docs pages.
        </p>
      </div>
    ),
  },
};

export const CompactPadding: Story = {
  args: {
    paddingY: "compact",
    children: (
      <div style={{ background: "var(--semantic-color-surface-raised, #1e1e2e)", padding: "24px", borderRadius: "8px" }}>
        <p style={{ margin: 0, color: "var(--semantic-color-content-primary, #cdd6f4)" }}>
          Compact vertical padding (24/32px) — useful for utility or secondary pages.
        </p>
      </div>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    paddingY: "none",
    children: (
      <div style={{ background: "var(--semantic-color-surface-raised, #1e1e2e)", padding: "24px", borderRadius: "8px" }}>
        <p style={{ margin: 0, color: "var(--semantic-color-content-primary, #cdd6f4)" }}>
          No vertical padding — for full-bleed or embedded surfaces.
        </p>
      </div>
    ),
  },
};
