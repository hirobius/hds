/**
 * CaseStudyLayout stories — macro-layout skeleton for portfolio case study pages.
 * @see src/app/layouts/CaseStudyLayout.tsx
 *
 * TODO: verify renders — CaseStudyLayout uses ErrorBoundary internally.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { CaseStudyLayout } from "../app/layouts/CaseStudyLayout";

const HeroSlot = () => (
  <div
    style={{
      background: "var(--semantic-color-surface-raised, #1e1e2e)",
      height: "320px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "8px",
      color: "var(--semantic-color-content-secondary, #888)",
      fontFamily: "monospace",
      fontSize: "13px",
    }}
  >
    heroSlot — full-width (1200px max)
  </div>
);

const IntroSlot = () => (
  <div
    style={{
      background: "var(--semantic-color-surface-raised, #1e1e2e)",
      padding: "32px",
      borderRadius: "8px",
      color: "var(--semantic-color-content-primary, #cdd6f4)",
    }}
  >
    <h2 style={{ margin: "0 0 16px" }}>Brief</h2>
    <p style={{ margin: 0, color: "var(--semantic-color-content-secondary, #888)" }}>
      introSlot — prose-width (760px max). Narrative, Brief/Problem/Solution sections live here.
    </p>
  </div>
);

const MetricsSlot = () => (
  <div
    style={{
      background: "var(--semantic-color-surface-raised, #1e1e2e)",
      padding: "24px",
      borderRadius: "8px",
      display: "flex",
      gap: "40px",
      color: "var(--semantic-color-content-primary, #cdd6f4)",
    }}
  >
    <div>
      <p style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 500 }}>3×</p>
      <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", color: "var(--semantic-color-content-secondary, #888)" }}>
        Conversion lift
      </p>
    </div>
    <div>
      <p style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 500 }}>94%</p>
      <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", color: "var(--semantic-color-content-secondary, #888)" }}>
        Satisfaction
      </p>
    </div>
  </div>
);

const ContentSlot = () => (
  <div
    style={{
      background: "var(--semantic-color-surface-raised, #1e1e2e)",
      padding: "32px",
      borderRadius: "8px",
      minHeight: "240px",
      color: "var(--semantic-color-content-secondary, #888)",
      fontFamily: "monospace",
      fontSize: "13px",
    }}
  >
    contentSlot — full-width (1200px max). Chapters, galleries, learnings.
  </div>
);

const meta = {
  title: "Templates/CaseStudyLayout",
  component: CaseStudyLayout,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Macro-layout skeleton for portfolio case study pages. Slot anatomy: heroSlot (full-width), introSlot (prose-width), metricsSlot (optional, full-width), contentSlot (full-width).",
      },
    },
  },
} satisfies Meta<typeof CaseStudyLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    heroSlot: <HeroSlot />,
    introSlot: <IntroSlot />,
    contentSlot: <ContentSlot />,
  },
};

export const WithMetrics: Story = {
  args: {
    heroSlot: <HeroSlot />,
    introSlot: <IntroSlot />,
    metricsSlot: <MetricsSlot />,
    contentSlot: <ContentSlot />,
  },
};
