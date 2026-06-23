/**
 * Sketch stories — shared shell for generative canvases and WebGL sketches.
 * @see src/app/components/sketch.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Sketch } from "../app/components/sketch";
import { HdsSlider } from "../app/components/controls";
import { HdsToggle } from "../app/components/controls";
import React, { useState } from "react";

const meta = {
  title: "Patterns/Sketch",
  component: Sketch,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Dark-themed shell for generative canvases and WebGL sketches. Provides a title bar, optional controls slot, and a flex canvas area.",
      },
    },
  },
  argTypes: {
    title: { control: "text" },
  },
} satisfies Meta<typeof Sketch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Particle Field",
    children: (
      <div
        style={{
          width: "100%",
          height: "320px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--semantic-color-content-secondary, #888)",
          fontFamily: "monospace",
          fontSize: "13px",
        }}
      >
        {"// canvas content renders here"}
      </div>
    ),
  },
};

export const WithControls: Story = {
  render: () => {
    const [count, setCount] = useState(80);
    const [showGrid, setShowGrid] = useState(false);
    return (
      <Sketch
        title="Flow Field"
        controls={
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{ width: "160px" }}>
              <HdsSlider label="Particles" min={10} max={200} step={10} value={count} onChange={setCount} />
            </div>
            <HdsToggle label="Grid" checked={showGrid} onChange={setShowGrid} />
          </div>
        }
      >
        <div
          style={{
            width: "100%",
            height: "320px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--semantic-color-content-secondary, #888)",
            fontFamily: "monospace",
            fontSize: "13px",
          }}
        >
          {`particles: ${count} | grid: ${showGrid}`}
        </div>
      </Sketch>
    );
  },
};
