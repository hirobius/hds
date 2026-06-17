/**
 * Container stories — maxWidth demos.
 * @see src/app/components/Container.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Container } from "../app/components/container";
import { Text } from "../app/components/text";
import { Surface } from "../app/components/surface";

const meta = {
  title: "Primitives/container",
  component: Container,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Semantic width-constrained layout wrapper. Centers content horizontally. maxWidth: 'content' (760px prose) | 'max' (1200px full layout). No arbitrary pixel values allowed.",
      },
    },
  },
  argTypes: {
    maxWidth: {
      control: { type: "radio" },
      options: ["content", "max"],
    },
  },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ContentWidth: Story = {
  args: { maxWidth: "content" },
  render: (args) => (
    <div style={{ padding: "24px", background: "var(--semantic-color-surface-page, #f9fafb)" }}>
      <Container {...args}>
        <Surface>
          <Text variant="heading2">Content width (760px)</Text>
          <Text variant="body">
            This container constrains prose to a comfortable reading measure.
            Use for documentation pages, case studies, and article layouts.
          </Text>
        </Surface>
      </Container>
    </div>
  ),
};

export const MaxWidth: Story = {
  args: { maxWidth: "max" },
  render: (args) => (
    <div style={{ padding: "24px", background: "var(--semantic-color-surface-page, #f9fafb)" }}>
      <Container {...args}>
        <Surface>
          <Text variant="heading2">Max width (1200px)</Text>
          <Text variant="body">
            Full layout width for dashboard surfaces, galleries, and
            grid-heavy pages.
          </Text>
        </Surface>
      </Container>
    </div>
  ),
};
