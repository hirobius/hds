/**
 * Disclosure stories — variant, slot, and controlled demos.
 * @see src/app/components/Disclosure.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { Disclosure } from "../app/components/disclosure";
import { Text } from "../app/components/text";

const meta = {
  title: "Primitives/disclosure",
  component: Disclosure,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Compact disclosure surface for optional explanatory content. Variants: panel | nav | card. Supports controlled and uncontrolled open state.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["panel", "nav", "card"],
    },
    defaultOpen: { control: "boolean" },
    accent: { control: "boolean" },
  },
} satisfies Meta<typeof Disclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Panel: Story = {
  args: {
    label: "Show details",
    variant: "panel",
    children: (
      <Text variant="body">
        This content is revealed when the disclosure is expanded. It uses the
        panel variant for documentation contexts.
      </Text>
    ),
  },
};

export const OpenByDefault: Story = {
  args: {
    label: "Expanded by default",
    defaultOpen: true,
    variant: "panel",
    children: (
      <Text variant="body">
        This disclosure starts open. It can still be toggled closed.
      </Text>
    ),
  },
};

function ControlledRender() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        // inline-ok: storybook-fixture
        style={{
          alignSelf: "flex-start",
          padding: "4px 12px",
          borderRadius: "4px",
          border: "1px solid var(--semantic-color-border-default, #d1d5db)",
          background: "transparent",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        {open ? "Close" : "Open"} externally
      </button>
      <Disclosure
        label="Controlled disclosure"
        open={open}
        onOpenChange={setOpen}
      >
        <Text variant="body">
          State is owned by the parent component above.
        </Text>
      </Disclosure>
    </div>
  );
}

export const Controlled: Story = {
  parameters: {
    docs: {
      description: {
        story: "Controlled open state driven externally via the open prop.",
      },
    },
  },
  render: () => <ControlledRender />,
};

export const MultipleItems: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Multiple independent disclosures demonstrating accordion-like patterns.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "480px" }}>
      <Disclosure label="What are design tokens?">
        <Text variant="body">
          Design tokens are named design decisions stored as key-value pairs,
          enabling consistent styling across platforms.
        </Text>
      </Disclosure>
      <Disclosure label="How does HDS handle theming?">
        <Text variant="body">
          HDS uses CSS custom properties resolved from the token system. Dark
          mode is handled via [data-theme] on the root element.
        </Text>
      </Disclosure>
      <Disclosure label="What is Ladle vs Storybook?">
        <Text variant="body">
          Storybook 8 was selected for HDS (over Ladle and Histoire) for its
          larger ecosystem, first-class a11y addon, and Chromatic integration.
        </Text>
      </Disclosure>
    </div>
  ),
};
