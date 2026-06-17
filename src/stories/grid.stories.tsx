/**
 * Grid stories — layout mode and column demos.
 * @see src/app/components/Grid.tsx
 */
import type { Meta, StoryObj } from "@storybook/react";
import { Grid } from "../app/components/grid";
import { Surface } from "../app/components/surface";
import { Text } from "../app/components/text";

const GridCard = ({ label }: { label: string }) => (
  <Surface padding="item">
    <Text variant="ui">{label}</Text>
  </Surface>
);

const meta = {
  title: "Primitives/grid",
  component: Grid,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Responsive grid composition primitive. layout='fixed': responsive 12-column base with tablet/mobile collapse. layout='auto-fit': responsive card wrapping. Use for two-dimensional layouts; use Stack for one-dimensional flow.",
      },
    },
  },
  argTypes: {
    layout: {
      control: { type: "radio" },
      options: ["fixed", "auto-fit"],
    },
    gap: {
      control: { type: "select" },
      options: ["tight", "normal", "inset", "spacious"],
    },
    columns: { control: { type: "number", min: 1, max: 12 } },
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoColumn: Story = {
  parameters: {
    docs: {
      description: { story: "Two equal columns via 6-span items in a 12-column grid." },
    },
  },
  render: () => (
    <Grid>
      <Grid.Item colSpan={6}>
        <GridCard label="Left column" />
      </Grid.Item>
      <Grid.Item colSpan={6}>
        <GridCard label="Right column" />
      </Grid.Item>
    </Grid>
  ),
};

export const ThreeColumn: Story = {
  parameters: {
    docs: {
      description: { story: "Three equal columns via 4-span items." },
    },
  },
  render: () => (
    <Grid>
      <Grid.Item colSpan={4}><GridCard label="Column 1" /></Grid.Item>
      <Grid.Item colSpan={4}><GridCard label="Column 2" /></Grid.Item>
      <Grid.Item colSpan={4}><GridCard label="Column 3" /></Grid.Item>
    </Grid>
  ),
};

export const AutoFit: Story = {
  args: { layout: "auto-fit" },
  render: (args) => (
    <Grid {...args}>
      <GridCard label="Card A" />
      <GridCard label="Card B" />
      <GridCard label="Card C" />
      <GridCard label="Card D" />
      <GridCard label="Card E" />
    </Grid>
  ),
};

export const AsideLayout: Story = {
  parameters: {
    docs: {
      description: { story: "8/4 content-to-sidebar split." },
    },
  },
  render: () => (
    <Grid gap="inset">
      <Grid.Item colSpan={8}>
        <GridCard label="Main content (8 cols)" />
      </Grid.Item>
      <Grid.Item colSpan={4}>
        <GridCard label="Sidebar (4 cols)" />
      </Grid.Item>
    </Grid>
  ),
};
