/**
 * Cluster stories — wrapping, gap, and alignment demos.
 * @see src/app/components/cluster.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Cluster } from '../app/components/cluster';

const Chip = ({ label }: { label: string }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: 'var(--semantic-color-surface-raised, #e5e7eb)',
      border: '1px solid var(--semantic-color-border-default, #d1d5db)',
      borderRadius: '999px',
      padding: '6px 14px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      color: 'var(--semantic-color-content-secondary, #6b7280)',
    }}
  >
    {label}
  </div>
);

const meta = {
  title: 'Primitives/cluster',
  component: Cluster,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Wrapping horizontal group with tokenized gaps in both axes. Use for tag rows, button groups, and chip lists that should wrap as a unit. Resize the preview to see the wrap behavior.',
      },
    },
  },
  argTypes: {
    gap: {
      control: { type: 'select' },
      options: ['tight', 'normal', 'inset', 'spacious'],
    },
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'stretch'],
    },
    justify: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'space-between'],
    },
  },
} satisfies Meta<typeof Cluster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { gap: 'tight' },
  render: (args) => (
    <div
      style={{
        maxWidth: 360,
        border: '1px dashed var(--semantic-color-border-default, #d1d5db)',
        padding: 12,
      }}
    >
      <Cluster {...args}>
        <Chip label="Landscaping" />
        <Chip label="Pressure Washing" />
        <Chip label="Junk Removal" />
        <Chip label="Concrete & Fencing" />
        <Chip label="Snow Removal" />
      </Cluster>
    </div>
  ),
};

export const SpaceBetween: Story = {
  args: { gap: 'normal', justify: 'space-between' },
  render: (args) => (
    <Cluster {...args} style={{ width: '100%' }}>
      <Chip label="Filter A" />
      <Chip label="Filter B" />
    </Cluster>
  ),
};

export const SpaciousGap: Story = {
  args: { gap: 'spacious' },
  render: (args) => (
    <Cluster {...args}>
      <Chip label="One" />
      <Chip label="Two" />
      <Chip label="Three" />
    </Cluster>
  ),
};
