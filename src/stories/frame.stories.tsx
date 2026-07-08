/**
 * Frame stories — ratio and radius demos.
 * @see src/app/components/frame.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Frame } from '../app/components/frame';

const Fill = ({ label }: { label: string }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      width: '100%',
      height: '100%',
      background:
        'linear-gradient(135deg, var(--semantic-color-accent, #6366f1), var(--semantic-color-surface-raised, #e5e7eb))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
    }}
  >
    {label}
  </div>
);

const meta = {
  title: 'Primitives/frame',
  component: Frame,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Aspect-ratio-locked, token-clipped media box — a thin, token-skinned wrapper over AspectRatio that adds the overflow-hidden clip and semantic corner radius a bare media frame needs.',
      },
    },
  },
  argTypes: {
    ratio: { control: { type: 'number' } },
    radius: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'full'],
    },
  },
} satisfies Meta<typeof Frame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Widescreen: Story = {
  args: { ratio: 16 / 9, radius: 'md' },
  render: (args) => (
    <div style={{ maxWidth: 480 }}>
      <Frame {...args}>
        <Fill label="16:9" />
      </Frame>
    </div>
  ),
};

export const Square: Story = {
  args: { ratio: 1, radius: 'sm' },
  render: (args) => (
    <div style={{ maxWidth: 240 }}>
      <Frame {...args}>
        <Fill label="1:1" />
      </Frame>
    </div>
  ),
};

export const NoRadius: Story = {
  args: { ratio: 4 / 3, radius: 'none' },
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <Frame {...args}>
        <Fill label="4:3, radius=none" />
      </Frame>
    </div>
  ),
};
