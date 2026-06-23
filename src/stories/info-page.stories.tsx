/**
 * InfoPage stories — branded profile surface for the portfolio landing page.
 * @see src/app/components/info-page.tsx
 *
 * TODO: verify renders — InfoPage has hard-coded asset path (/assets/adrian.webp)
 * and InlineLink (react-router) children. Wrap in MemoryRouter for safety.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { InfoPage } from "../app/components/info-page";

const meta = {
  title: "Templates/InfoPage",
  component: InfoPage,
  tags: ["autodocs"],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Branded profile surface used for the portfolio landing page. Renders portrait image, name, role, and bio. isDark controls the theme flag (tokenized CSS drives the actual swap).",
      },
    },
  },
  argTypes: {
    isDark: { control: "boolean" },
  },
} satisfies Meta<typeof InfoPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightMode: Story = {
  args: {
    isDark: false,
  },
};

export const DarkMode: Story = {
  args: {
    isDark: true,
  },
};
