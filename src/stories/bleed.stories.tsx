/**
 * Bleed stories — negative-margin full-bleed demos.
 * @see src/app/components/bleed.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Bleed } from '../app/components/bleed';

const FullBleedBand = () => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: 'var(--semantic-color-accent, #6366f1)',
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
    }}
  >
    Bleeds past the parent&apos;s padding
  </div>
);

const meta = {
  title: 'Primitives/bleed',
  component: Bleed,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Controlled negative-margin full-bleed within a padded container. amount MUST match the ancestor padding it cancels out.',
      },
    },
  },
  argTypes: {
    amount: {
      control: { type: 'select' },
      options: ['tight', 'normal', 'inset', 'spacious'],
    },
    axis: {
      control: { type: 'radio' },
      options: ['x', 'y', 'both'],
    },
  },
} satisfies Meta<typeof Bleed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BleedX: Story = {
  args: { amount: 'normal', axis: 'x' },
  render: (args) => (
    <div
      style={{
        padding: 'var(--semantic-space-layout-normal, 24px)',
        border: '1px dashed var(--semantic-color-border-default, #d1d5db)',
        maxWidth: 400,
      }}
    >
      <p style={{ fontSize: 12, margin: 0, marginBottom: 8 }}>Padded parent content</p>
      <Bleed {...args}>
        <FullBleedBand />
      </Bleed>
      <p style={{ fontSize: 12, margin: 0, marginTop: 8 }}>
        Bleed cancels the parent&apos;s padding
      </p>
    </div>
  ),
};

export const BleedBoth: Story = {
  args: { amount: 'inset', axis: 'both' },
  render: (args) => (
    <div
      style={{
        padding: 'var(--semantic-space-layout-inset, 32px)',
        border: '1px dashed var(--semantic-color-border-default, #d1d5db)',
        maxWidth: 400,
      }}
    >
      <Bleed {...args}>
        <FullBleedBand />
      </Bleed>
    </div>
  ),
};
