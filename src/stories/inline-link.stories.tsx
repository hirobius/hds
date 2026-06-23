/**
 * InlineLink stories — inline navigation and external-link primitive for body copy.
 * @see src/app/components/inline-link.tsx
 *
 * InlineLink uses React Router Link for internal hrefs, so stories are wrapped
 * in MemoryRouter.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { InlineLink } from "../app/components/inline-link";

const meta = {
  title: "Primitives/InlineLink",
  component: InlineLink,
  tags: ["autodocs"],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Inline body text link. Internal hrefs use client-side React Router navigation. External hrefs open in a new tab with an optional external-link icon.",
      },
    },
  },
  argTypes: {
    externalIcon: { control: "boolean" },
  },
} satisfies Meta<typeof InlineLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Internal: Story = {
  args: {
    href: "/components/button",
    children: "Button component",
  },
};

export const External: Story = {
  args: {
    href: "https://www.figma.com",
    children: "Figma",
    externalIcon: true,
  },
};

export const ExternalNoIcon: Story = {
  args: {
    href: "https://www.figma.com",
    children: "Figma",
    externalIcon: false,
  },
};

export const InProse: Story = {
  parameters: {
    docs: {
      description: {
        story: "InlineLink inside a prose paragraph.",
      },
    },
  },
  render: () => (
    <p style={{ maxWidth: "480px", lineHeight: 1.6 }}>
      The Hirobius Design System is documented in{" "}
      <InlineLink href="/components">the component library</InlineLink> and is
      also available via the{" "}
      <InlineLink href="https://www.figma.com" externalIcon>
        Figma plugin
      </InlineLink>
      .
    </p>
  ),
};
