/**
 * Cover stories — header/main/footer centering demos.
 * @see src/app/components/cover.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Cover } from '../app/components/cover';

const Block = ({ label }: { label: string }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      background: 'var(--semantic-color-surface-raised, #e5e7eb)',
      border: '1px solid var(--semantic-color-border-default, #d1d5db)',
      borderRadius: '6px',
      padding: '16px',
      fontSize: '12px',
      textAlign: 'center',
      color: 'var(--semantic-color-content-secondary, #6b7280)',
    }}
  >
    {label}
  </div>
);

const meta = {
  title: 'Primitives/cover',
  component: Cover,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Vertical shell with an optional header, an auto-centered main region that absorbs remaining space, and an optional footer — via flex auto-margin centering, no absolute positioning.',
      },
    },
  },
} satisfies Meta<typeof Cover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HeaderMainFooter: Story = {
  args: { minHeight: '60vh', gap: 'normal' },
  render: (args) => (
    <Cover {...args} header={<Block label="Header" />} footer={<Block label="Footer" />}>
      <Block label="Centered main region" />
    </Cover>
  ),
};

export const MainOnly: Story = {
  args: { minHeight: '60vh', gap: 'normal' },
  render: (args) => (
    <Cover {...args}>
      <Block label="Centered main region, no header or footer" />
    </Cover>
  ),
};

export const HeaderOnly: Story = {
  args: { minHeight: '60vh', gap: 'normal' },
  render: (args) => (
    <Cover {...args} header={<Block label="Header" />}>
      <Block label="Main region — footer omitted" />
    </Cover>
  ),
};
