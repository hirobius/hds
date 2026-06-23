/**
 * Tabs stories — Radix-backed underline tab group (compound).
 * @see src/app/components/tabs.tsx
 *
 * Tabs / TabsList / TabsTrigger / TabsContent are compound parts that must
 * be used together. This file composes full examples rather than isolated
 * sub-part stories.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../app/components/tabs";

const meta = {
  title: "Primitives/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Radix-backed underline tabs. Compound parts: Tabs (root), TabsList, TabsTrigger, TabsContent. Horizontally scrollable at narrow viewports.",
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="props">Props</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p style={{ margin: 0 }}>
          Overview panel content — describes what the component does at a high level.
        </p>
      </TabsContent>
      <TabsContent value="props">
        <p style={{ margin: 0 }}>
          Props panel — lists accepted props, types, and defaults.
        </p>
      </TabsContent>
      <TabsContent value="usage">
        <p style={{ margin: 0 }}>
          Usage panel — code snippets and composition patterns.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

export const ManyTabs: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Eight tabs — verifies horizontal scroll behaviour at narrow container widths.",
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: "480px" }}>
      <Tabs defaultValue="tab1">
        <TabsList>
          {["Primitives", "Patterns", "Templates", "Tokens", "Motion", "Icons", "Layout", "Forms"].map(
            (label) => (
              <TabsTrigger key={label} value={label.toLowerCase()}>
                {label}
              </TabsTrigger>
            ),
          )}
        </TabsList>
        <TabsContent value="primitives">
          <p style={{ margin: 0 }}>Primitives panel.</p>
        </TabsContent>
        <TabsContent value="patterns">
          <p style={{ margin: 0 }}>Patterns panel.</p>
        </TabsContent>
        <TabsContent value="templates">
          <p style={{ margin: 0 }}>Templates panel.</p>
        </TabsContent>
        <TabsContent value="tokens">
          <p style={{ margin: 0 }}>Tokens panel.</p>
        </TabsContent>
        <TabsContent value="motion">
          <p style={{ margin: 0 }}>Motion panel.</p>
        </TabsContent>
        <TabsContent value="icons">
          <p style={{ margin: 0 }}>Icons panel.</p>
        </TabsContent>
        <TabsContent value="layout">
          <p style={{ margin: 0 }}>Layout panel.</p>
        </TabsContent>
        <TabsContent value="forms">
          <p style={{ margin: 0 }}>Forms panel.</p>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="active">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value="another">Another</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <p style={{ margin: 0 }}>This tab is active and reachable.</p>
      </TabsContent>
      <TabsContent value="disabled">
        <p style={{ margin: 0 }}>This panel cannot be reached via the disabled trigger.</p>
      </TabsContent>
      <TabsContent value="another">
        <p style={{ margin: 0 }}>Another reachable panel.</p>
      </TabsContent>
    </Tabs>
  ),
};
