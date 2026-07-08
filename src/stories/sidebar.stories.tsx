/**
 * Sidebar stories — rail + fluid content wrap demos.
 * @see src/app/components/sidebar.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '../app/components/sidebar';

const Panel = ({ label, minHeight = 80 }: { label: string; minHeight?: number }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: 'var(--semantic-color-surface-raised, #e5e7eb)',
      border: '1px solid var(--semantic-color-border-default, #d1d5db)',
      borderRadius: '6px',
      padding: '16px',
      minHeight,
      fontSize: '12px',
      color: 'var(--semantic-color-content-secondary, #6b7280)',
    }}
  >
    {label}
  </div>
);

const meta = {
  title: 'Primitives/sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Fixed-width rail beside fluid content that wraps to stacked below a threshold — pure flex-basis/flex-grow disparity, no media query. Resize the preview narrower than sideWidth + contentMin to see it stack.',
      },
    },
  },
  argTypes: {
    side: {
      control: { type: 'radio' },
      options: ['start', 'end'],
    },
    gap: {
      control: { type: 'select' },
      options: ['tight', 'normal', 'inset', 'spacious'],
    },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RailStart: Story = {
  args: { side: 'start', sideWidth: '14rem', contentMin: '20rem' },
  render: (args) => (
    <Sidebar {...args}>
      <Panel label="Rail (14rem)" />
      <Panel label="Fluid content" />
    </Sidebar>
  ),
};

export const RailEnd: Story = {
  args: { side: 'end', sideWidth: '14rem', contentMin: '20rem' },
  render: (args) => (
    <Sidebar {...args}>
      <Panel label="Rail (14rem, visually on the right)" />
      <Panel label="Fluid content" />
    </Sidebar>
  ),
};

export const NarrowContainerStacks: Story = {
  args: { side: 'start', sideWidth: '14rem', contentMin: '20rem' },
  render: (args) => (
    <div
      style={{ maxWidth: 320, border: '1px dashed var(--semantic-color-border-default, #d1d5db)' }}
    >
      <Sidebar {...args}>
        <Panel label="Rail" />
        <Panel label="Content stacks below the rail once the container is too narrow to fit contentMin" />
      </Sidebar>
    </div>
  ),
};
