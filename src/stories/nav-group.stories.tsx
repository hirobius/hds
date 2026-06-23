/**
 * NavGroup stories — labeled navigation group for stacks of nav items.
 * @see src/app/components/nav-group.tsx
 *
 * NavGroup uses useLocation from react-router, so all stories are wrapped
 * in MemoryRouter to provide the required router context.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { NavGroup } from "../app/components/nav-group";

const ITEMS = [
  { path: "/primitives/button", label: "Button" },
  { path: "/primitives/badge", label: "Badge" },
  { path: "/primitives/callout", label: "Callout" },
  { path: "/primitives/input", label: "Input" },
];

const meta = {
  title: "Patterns/NavGroup",
  component: NavGroup,
  tags: ["autodocs"],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Labeled navigation group for stacks of NavItems. Supports collapsible state. Variants: side | toc.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["side", "toc"],
    },
    collapsible: { control: "boolean" },
  },
} satisfies Meta<typeof NavGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Primitives",
    variant: "side",
    items: ITEMS,
  },
};

export const Collapsible: Story = {
  args: {
    label: "Primitives",
    variant: "side",
    collapsible: true,
    items: ITEMS,
  },
};

export const TocVariant: Story = {
  args: {
    label: "On this page",
    variant: "toc",
    items: [
      { path: "#overview", label: "Overview" },
      { path: "#props", label: "Props" },
      { path: "#usage", label: "Usage" },
      { path: "#accessibility", label: "Accessibility" },
    ],
  },
};

export const NoLabel: Story = {
  args: {
    variant: "side",
    items: ITEMS,
  },
};
