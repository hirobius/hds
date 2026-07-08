/**
 * Pin stories — sticky-pin within a scroll region. Scroll the canvas to watch
 * the pinned rail hold while the content column scrolls past.
 * @see src/app/components/pin.tsx
 */
/* eslint-disable no-restricted-syntax -- story fixtures use raw grid to showcase the primitive */
import type { Meta, StoryObj } from '@storybook/react';
import { Pin } from '../app/components/pin';

const meta = {
  title: 'Primitives/pin',
  component: Pin,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Sticky-pin (`position: sticky`) within a taller scrolling parent — the dependency-free basis for pinned scroll scenes. Give the pinned element a taller parent so it has room to travel.',
      },
    },
  },
  argTypes: {
    top: { control: { type: 'text' } },
  },
} satisfies Meta<typeof Pin>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A pinned rail beside a tall scrolling column. */
export const Sidebar: Story = {
  args: { top: '24px' },
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, padding: 24 }}>
      <Pin {...args} style={{ height: 'fit-content' }}>
        <nav
          // inline-ok: storybook-fixture
          style={{
            padding: 16,
            borderRadius: 'var(--semantic-radius-action, 12px)',
            background: 'var(--semantic-color-surface-raised, #f4f4f5)',
            border: '1px solid var(--semantic-color-border-default, #d4d4d8)',
            fontSize: 13,
          }}
        >
          Pinned rail — stays put while you scroll →
        </nav>
      </Pin>
      <div style={{ display: 'grid', gap: 16 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              height: 160,
              borderRadius: 'var(--semantic-radius-action, 12px)',
              background: 'var(--semantic-color-surface-raised, #f4f4f5)',
              border: '1px solid var(--semantic-color-border-default, #d4d4d8)',
            }}
          />
        ))}
      </div>
    </div>
  ),
};
