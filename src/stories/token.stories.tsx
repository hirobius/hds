/**
 * Token stories — reflective token specimen for token views.
 * @see src/app/components/token.tsx
 *
 * Token uses useLocation and useNavigate from react-router, so stories are
 * wrapped in MemoryRouter.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { Token } from "../app/components/token";

const meta = {
  title: "Primitives/Token",
  component: Token,
  tags: ["autodocs"],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Reflective token specimen. variant='node' renders the canonical token surface with an optional color swatch and deep-link behaviour. variant='diagram' is a compatibility alias.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["node", "diagram"],
    },
    fullWidth: { control: "boolean" },
    nowrap: { control: "boolean" },
    truncateFromStart: { control: "boolean" },
  },
} satisfies Meta<typeof Token>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NodeDefault: Story = {
  args: {
    variant: "node",
    children: "semantic.color.content.primary",
  },
};

export const NodeWithSwatch: Story = {
  args: {
    variant: "node",
    children: "semantic.color.surface.raised",
    swatchVar: "var(--semantic-color-surface-raised)",
  },
};

export const NodeFullWidth: Story = {
  args: {
    variant: "node",
    children: "component.tag.paddingX",
    fullWidth: true,
  },
};

export const NodeTruncateFromStart: Story = {
  args: {
    variant: "node",
    children: "semantic.space.layout.gap",
    truncateFromStart: true,
  },
};

export const Diagram: Story = {
  args: {
    variant: "diagram",
    label: "semantic.color.content.primary",
    value: "#cdd6f4",
    accentColor: "var(--semantic-color-content-accent)",
  },
};
