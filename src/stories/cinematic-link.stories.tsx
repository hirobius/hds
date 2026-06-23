/**
 * CinematicLink stories — cinematic editorial link treatment for portfolio surfaces.
 * @see src/app/components/cinematic-link.tsx
 *
 * CinematicLink is a plain <a> tag (no react-router dependency), so no
 * MemoryRouter decorator is required.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { CinematicLink } from "../app/components/cinematic-link";

const meta = {
  title: "Primitives/CinematicLink",
  component: CinematicLink,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Cinematic editorial link treatment: text slides up on hover, animated underline. Designed for portfolio surfaces and editorial headers. Accepts a string child only.",
      },
    },
  },
} satisfies Meta<typeof CinematicLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    href: "#",
    children: "View case study",
  },
};

export const LongerLabel: Story = {
  args: {
    href: "#",
    children: "Explore the design system",
  },
};

export const MultipleLinks: Story = {
  parameters: {
    docs: {
      description: {
        story: "Multiple cinematic links stacked to show the treatment in context.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
      <CinematicLink href="#">Product design</CinematicLink>
      <CinematicLink href="#">Motion & interaction</CinematicLink>
      <CinematicLink href="#">Systems thinking</CinematicLink>
    </div>
  ),
};
