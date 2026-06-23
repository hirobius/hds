/**
 * NavItem stories — navigation row primitive for sidebars and TOC.
 * @see src/app/components/nav-item.tsx
 *
 * NavItem uses useNavigate from react-router, so all stories are wrapped
 * in MemoryRouter to provide the required router context.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { NavItem } from "../app/components/nav-item";

const meta = {
  title: "Primitives/NavItem",
  component: NavItem,
  tags: ["autodocs"],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Navigation row primitive for sidebars and table-of-contents. Variants: side | toc. Levels: root | section | subsection.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["side", "toc"],
    },
    level: {
      control: { type: "select" },
      options: ["root", "section", "subsection"],
    },
    active: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Components",
    href: "/components",
    variant: "side",
    level: "root",
  },
};

export const Active: Story = {
  args: {
    label: "Button",
    href: "/components/button",
    variant: "side",
    active: true,
    level: "section",
  },
};

export const Disabled: Story = {
  args: {
    label: "Deprecated",
    href: "/deprecated",
    variant: "side",
    disabled: true,
  },
};

export const TocVariant: Story = {
  args: {
    label: "Props",
    href: "#props",
    variant: "toc",
    level: "root",
  },
};

export const TocActive: Story = {
  args: {
    label: "Usage",
    href: "#usage",
    variant: "toc",
    active: true,
  },
};

export const SidebarStack: Story = {
  parameters: {
    docs: {
      description: {
        story: "A stack of nav items simulating a sidebar group.",
      },
    },
  },
  render: () => (
    <div style={{ width: "240px" }}>
      <NavItem label="Overview" href="/" variant="side" />
      <NavItem label="Primitives" href="/primitives" variant="side" active />
      <NavItem label="Patterns" href="/patterns" variant="side" />
      <NavItem label="Templates" href="/templates" variant="side" disabled />
    </div>
  ),
};
