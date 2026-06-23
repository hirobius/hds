/**
 * ErrorPattern stories — governed recovery surface for routed application errors.
 * @see src/app/components/error-pattern.tsx
 *
 * ErrorPattern uses useNavigate from react-router, so stories are wrapped
 * in MemoryRouter.
 *
 * TODO: verify renders — needs MemoryRouter context for useNavigate.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router";
import { ErrorPattern } from "../app/components/error-pattern";

const meta = {
  title: "Templates/ErrorPattern",
  component: ErrorPattern,
  tags: ["autodocs"],
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Governed recovery surface for routed application errors. Renders a full-viewport centred surface with an animated cascade headline, message, and Back button.",
      },
    },
  },
  argTypes: {
    displayText: { control: "text" },
    message: { control: "text" },
  },
} satisfies Meta<typeof ErrorPattern>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    displayText: "Oops",
    message: "Something went wrong",
  },
};

export const NotFound: Story = {
  args: {
    displayText: "404",
    message: "Page not found",
  },
};

export const Unauthorized: Story = {
  args: {
    displayText: "401",
    message: "Unauthorized",
  },
};
