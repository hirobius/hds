/**
 * FoundationSwatch stories — color specimen label, value, token path, details.
 * @see src/app/components/FoundationSwatch.tsx
 */
import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FoundationSwatch } from "../app/components/foundation-swatch";
import { Grid } from "../app/components/grid";

const meta = {
  title: "Primitives/foundation-swatch",
  component: FoundationSwatch,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Governed foundation specimen for color and semantic role previews. Renders a labeled swatch with optional token path, value, details, and custom specimen slot. Foreground/background contrast is the caller's responsibility — pair with WCAG AA verification.",
      },
    },
  },
  argTypes: {
    bordered: { control: "boolean" },
    previewPosition: {
      control: { type: "select" },
      options: ["bottom-left", "top-left", "center"],
    },
    tokenDisplayPreset: {
      control: { type: "radio" },
      options: ["depth1", "depth2", "full"],
    },
  },
} satisfies Meta<typeof FoundationSwatch>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    label: "bg.default",
    background: "var(--semantic-color-bg-default, #ffffff)",
    bordered: true,
  },
};

// ── Semantic tones ───────────────────────────────────────────────────────────

export const FeedbackPalette: Story = {
  parameters: {
    docs: {
      description: {
        story: "All four feedback background tones rendered side-by-side.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
      <FoundationSwatch
        label="Info"
        background="var(--semantic-color-feedback-bg-info, #e8f0fe)"
        foreground="var(--semantic-color-feedback-info, #1a73e8)"
        tokenPath="semantic.color.feedback.bg.info"
      />
      <FoundationSwatch
        label="Success"
        background="var(--semantic-color-feedback-bg-success, #e6f4ea)"
        foreground="var(--semantic-color-feedback-success, #1e8e3e)"
        tokenPath="semantic.color.feedback.bg.success"
      />
      <FoundationSwatch
        label="Warning"
        background="var(--semantic-color-feedback-bg-warning, #fef7e0)"
        foreground="var(--semantic-color-feedback-warning, #f9ab00)"
        tokenPath="semantic.color.feedback.bg.warning"
      />
      <FoundationSwatch
        label="Error"
        background="var(--semantic-color-feedback-bg-error, #fce8e6)"
        foreground="var(--semantic-color-feedback-error, #d93025)"
        tokenPath="semantic.color.feedback.bg.error"
      />
    </div>
  ),
};

// ── With token path + value + details ────────────────────────────────────────

export const WithDetails: Story = {
  parameters: {
    docs: {
      description: {
        story: "Token path, hex value, and detail lines for richer specimen documentation.",
      },
    },
  },
  render: () => (
    <FoundationSwatch
      label="Content Primary"
      background="var(--semantic-color-bg-default, #ffffff)"
      foreground="var(--semantic-color-content-primary, #111111)"
      value="#111111"
      details={["Role: primary text", "Contrast: 16.1:1 on bg.default"]}
      tokenPath="semantic.color.content.primary"
      bordered
    />
  ),
};

// ── Custom specimen slot ─────────────────────────────────────────────────────

export const WithSpecimen: Story = {
  parameters: {
    docs: {
      description: {
        story: "Custom specimen slot for non-color tokens such as border or spacing rulers.",
      },
    },
  },
  render: () => (
    <FoundationSwatch
      label="Border Default"
      background="var(--semantic-color-bg-subtle, #f9f9f9)"
      specimen={
        <div
          style={{
            width: "100%",
            height: "2px",
            background: "var(--semantic-color-border-default, #e5e5e5)",
            borderRadius: "1px",
          }}
        />
      }
      bordered
    />
  ),
};

// ── Grid of swatches ─────────────────────────────────────────────────────────

export const ColorGrid: Story = {
  parameters: {
    docs: {
      description: {
        story: "Grid layout showing multiple swatches — typical usage on a Color foundation page.",
      },
    },
  },
  render: () => (
    <Grid layout="auto-fit" gap="inset">
      {[
        {
          label: "bg.default",
          background: "var(--semantic-color-bg-default, #ffffff)",
          foreground: "var(--semantic-color-content-primary, #111)",
          bordered: true,
        },
        {
          label: "bg.subtle",
          background: "var(--semantic-color-bg-subtle, #f9f9f9)",
          foreground: "var(--semantic-color-content-primary, #111)",
          bordered: true,
        },
        {
          label: "bg.brand",
          background: "var(--semantic-color-bg-brand, #0066ff)",
          foreground: "#ffffff",
        },
        {
          label: "content.primary",
          background: "var(--semantic-color-content-primary, #111111)",
          foreground: "#ffffff",
        },
        {
          label: "content.secondary",
          background: "var(--semantic-color-content-secondary, #666666)",
          foreground: "#ffffff",
        },
        {
          label: "border.default",
          background: "var(--semantic-color-border-default, #e5e5e5)",
          foreground: "var(--semantic-color-content-primary, #111)",
          bordered: true,
        },
      ].map(({ label, background, foreground, bordered }) => (
        <FoundationSwatch
          key={label}
          label={label}
          background={background}
          foreground={foreground}
          bordered={bordered}
        />
      ))}
    </Grid>
  ),
};
