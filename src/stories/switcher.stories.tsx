/**
 * Switcher stories — threshold flip and limit demos.
 * @see src/app/components/switcher.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Switcher } from '../app/components/switcher';

const Panel = ({ label }: { label: string }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: 'var(--semantic-color-surface-raised, #e5e7eb)',
      border: '1px solid var(--semantic-color-border-default, #d1d5db)',
      borderRadius: '6px',
      padding: '16px',
      fontSize: '12px',
      color: 'var(--semantic-color-content-secondary, #6b7280)',
    }}
  >
    {label}
  </div>
);

const meta = {
  title: 'Primitives/switcher',
  component: Switcher,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Flips a row of peer items to a vertical stack once the container is narrower than `threshold`, via the flex-basis calc() technique — no media query. `limit` unconditionally forces the stacked layout once there are more than `limit` children. Resize the preview to see the flip.',
      },
    },
  },
  argTypes: {
    gap: {
      control: { type: 'select' },
      options: ['tight', 'normal', 'inset', 'spacious'],
    },
    limit: { control: { type: 'number', min: 1, max: 6 } },
  },
} satisfies Meta<typeof Switcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { threshold: '30rem', gap: 'normal' },
  render: (args) => (
    <Switcher {...args}>
      <Panel label="Item A" />
      <Panel label="Item B" />
      <Panel label="Item C" />
    </Switcher>
  ),
};

export const NarrowContainerStacks: Story = {
  args: { threshold: '30rem', gap: 'normal' },
  render: (args) => (
    <div
      style={{ maxWidth: 320, border: '1px dashed var(--semantic-color-border-default, #d1d5db)' }}
    >
      <Switcher {...args}>
        <Panel label="Item A" />
        <Panel label="Item B" />
        <Panel label="Item C" />
      </Switcher>
    </div>
  ),
};

export const LimitForcesStacked: Story = {
  args: { threshold: '30rem', gap: 'normal', limit: 3 },
  render: (args) => (
    <Switcher {...args}>
      <Panel label="Item A" />
      <Panel label="Item B" />
      <Panel label="Item C" />
      <Panel label="Item D — pushes count above limit=3, forces stacked" />
    </Switcher>
  ),
};
