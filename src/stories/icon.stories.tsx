/**
 * Icon stories — size, color, and weight demos.
 * @see src/app/components/Icon.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import {
  Star,
  Settings,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Icon } from "../app/components/icon";

const meta = {
  title: "Primitives/icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Semantic icon wrapper for Lucide icons. Standardizes sizes and colors via HDS token system. Decorative by default (aria-hidden=true); pass aria-hidden={false} and a title for meaningful icons.",
      },
    },
  },
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["xsmall", "small", "medium", "large", "xlarge"],
    },
    color: { control: "color" },
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Star,
    size: "small",
  },
};

export const Medium: Story = {
  args: {
    icon: Settings,
    size: "medium",
  },
};

export const Large: Story = {
  args: {
    icon: ChevronRight,
    size: "large",
  },
};

export const SemanticColor: Story = {
  args: {
    icon: AlertCircle,
    size: "medium",
    color: "var(--semantic-color-feedback-warning)",
  },
};

export const SizeGallery: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "All size tokens rendered for comparison.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Icon icon={Star} size="xsmall" />
      <Icon icon={Star} size="small" />
      <Icon icon={Star} size="medium" />
      <Icon icon={Star} size="large" />
      <Icon icon={Star} size="xlarge" />
    </div>
  ),
};

export const SemanticColors: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Icons using feedback color tokens.",
      },
    },
  },
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <Icon
        icon={Info}
        size="medium"
        color="var(--semantic-color-feedback-info)"
      />
      <Icon
        icon={CheckCircle2}
        size="medium"
        color="var(--semantic-color-feedback-success)"
      />
      <Icon
        icon={AlertCircle}
        size="medium"
        color="var(--semantic-color-feedback-warning)"
      />
    </div>
  ),
};
