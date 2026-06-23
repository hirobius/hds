/**
 * HdsSlider stories — range slider with label and animated value display.
 * @see src/app/components/controls.tsx
 */
import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HdsSlider } from "../app/components/controls";

// ── HdsSlider ────────────────────────────────────────────────────────────────

const SliderMeta = {
  title: "Primitives/HdsSlider",
  component: HdsSlider,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Range slider with label and animated value display. Controlled: pass value + onChange.",
      },
    },
  },
} satisfies Meta<typeof HdsSlider>;

export default SliderMeta;
type SliderStory = StoryObj<typeof SliderMeta>;

export const Default: SliderStory = {
  render: () => {
    const [value, setValue] = useState(40);
    return <HdsSlider label="Opacity" min={0} max={100} step={1} value={value} onChange={setValue} />;
  },
};

export const DecimalStep: SliderStory = {
  render: () => {
    const [value, setValue] = useState(1.5);
    return (
      <HdsSlider
        label="Border radius (rem)"
        min={0}
        max={4}
        step={0.25}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const FullRange: SliderStory = {
  render: () => {
    const [value, setValue] = useState(0);
    return (
      <HdsSlider label="Font size (px)" min={10} max={72} step={2} value={value} onChange={setValue} />
    );
  },
};
