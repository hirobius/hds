/**
 * IconButton stories — variant, size, and a11y demos.
 * @see src/app/components/IconButton.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Settings, Copy, Trash2, Plus, X } from "lucide-react";
import { IconButton } from "../app/components/icon-button";

const meta = {
  title: "Primitives/icon-button",
  component: IconButton,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Icon-only action trigger built on Button. Always requires an accessible label (aria-label or label prop). Sizes map to the button ramp: sm=32px | md=40px | lg=48px.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "tertiary"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Settings,
    label: "Settings",
    variant: "secondary",
    size: "md",
  },
};

export const Primary: Story = {
  args: {
    icon: Plus,
    label: "Add item",
    variant: "primary",
    size: "md",
  },
};

export const Tertiary: Story = {
  args: {
    icon: X,
    label: "Dismiss",
    variant: "tertiary",
    size: "sm",
  },
};

export const Disabled: Story = {
  args: {
    icon: Trash2,
    label: "Delete",
    variant: "secondary",
    disabled: true,
  },
};

export const SizeGallery: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "All three sizes side-by-side for comparison.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <IconButton icon={Copy} label="Copy (sm)" size="sm" />
      <IconButton icon={Copy} label="Copy (md)" size="md" />
      <IconButton icon={Copy} label="Copy (lg)" size="lg" />
    </div>
  ),
};
