/**
 * AssetImg stories — responsive image frame with placeholder fallback.
 * @see src/app/components/asset-img.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { AssetImg } from "../app/components/asset-img";

const meta = {
  title: "Primitives/AssetImg",
  component: AssetImg,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Responsive asset frame with automatic placeholder fallback. Contexts: default | lightbox | detail. Supports expandable tooltip on interactive assets.",
      },
    },
  },
  argTypes: {
    context: {
      control: { type: "select" },
      options: ["default", "lightbox", "detail"],
    },
    loading: {
      control: { type: "select" },
      options: ["lazy", "eager"],
    },
    expandable: { control: "boolean" },
    isDark: { control: "boolean" },
  },
} satisfies Meta<typeof AssetImg>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "https://placehold.co/400x300/1a1a2e/ffffff?text=Asset",
    alt: "A placeholder asset",
    style: { maxWidth: "400px", width: "100%" },
  },
};

export const WithTitle: Story = {
  args: {
    src: "https://placehold.co/400x300/1a1a2e/ffffff?text=Asset",
    alt: "Asset with title",
    title: "Portfolio asset — interaction design prototype",
    style: { maxWidth: "400px", width: "100%" },
  },
};

export const EagerLoading: Story = {
  args: {
    src: "https://placehold.co/600x400/2d2d4e/ffffff?text=Above+fold",
    alt: "Above-the-fold asset",
    loading: "eager",
    style: { maxWidth: "600px", width: "100%" },
  },
};

export const FallbackPlaceholder: Story = {
  args: {
    src: "/nonexistent-image.webp",
    alt: "Broken image — shows placeholder",
    naturalWidth: 800,
    naturalHeight: 600,
  },
};

export const PortraitAspectRatio: Story = {
  args: {
    src: "/nonexistent-portrait.webp",
    alt: "Portrait placeholder",
    naturalWidth: 400,
    naturalHeight: 600,
  },
};
