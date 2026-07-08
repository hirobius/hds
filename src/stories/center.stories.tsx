/**
 * Center stories — max-width and gutter demos.
 * @see src/app/components/center.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Center } from '../app/components/center';

const Prose = () => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: 'var(--semantic-color-surface-raised, #e5e7eb)',
      border: '1px solid var(--semantic-color-border-default, #d1d5db)',
      borderRadius: '6px',
      padding: '16px',
      fontSize: '14px',
      color: 'var(--semantic-color-content-secondary, #6b7280)',
    }}
  >
    This column is centered and constrained to a semantic max-width — resize the preview wider than
    the max-width to see the auto margins take over.
  </div>
);

const meta = {
  title: 'Primitives/center',
  component: Center,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Max-width column with auto horizontal margins and an optional matching gutter. Use for centered prose or content columns.',
      },
    },
  },
  argTypes: {
    maxWidth: {
      control: { type: 'radio' },
      options: ['content', 'max'],
    },
    gutter: {
      control: { type: 'select' },
      options: [undefined, 'tight', 'normal', 'inset', 'spacious'],
    },
  },
} satisfies Meta<typeof Center>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ContentWidth: Story = {
  args: { maxWidth: 'content' },
  render: (args) => (
    <Center {...args}>
      <Prose />
    </Center>
  ),
};

export const MaxWidth: Story = {
  args: { maxWidth: 'max' },
  render: (args) => (
    <Center {...args}>
      <Prose />
    </Center>
  ),
};

export const WithGutter: Story = {
  args: { maxWidth: 'content', gutter: 'normal' },
  render: (args) => (
    <div style={{ background: 'var(--semantic-color-surface-overlay, #f3f4f6)' }}>
      <Center {...args}>
        <Prose />
      </Center>
    </div>
  ),
};
