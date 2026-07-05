/**
 * Tokenizer stories.
 * @see src/app/components/tokenizer.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Tokenizer } from '../app/components/tokenizer';

const meta = {
  title: 'Patterns/tokenizer',
  component: Tokenizer,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Tokenizer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Controlled demo ──────────────────────────────────────────────────────────

function ControlledDemo() {
  const [tags, setTags] = useState(['react', 'design', 'tokens']);
  return (
    <div style={{ width: '320px' }}>
      <Tokenizer value={tags} onChange={setTags} placeholder="Add a tag…" aria-label="Tags" />
    </div>
  );
}

export const Default: Story = {
  render: () => <ControlledDemo />,
};

// ── Empty ─────────────────────────────────────────────────────────────────────

function EmptyDemo() {
  const [tags, setTags] = useState<string[]>([]);
  return (
    <div style={{ width: '320px' }}>
      <Tokenizer
        value={tags}
        onChange={setTags}
        placeholder="Type and press Enter…"
        aria-label="Tags"
      />
    </div>
  );
}

export const Empty: Story = {
  render: () => <EmptyDemo />,
};

// ── Disabled ──────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => (
    <div style={{ width: '320px' }}>
      <Tokenizer value={['react', 'design']} onChange={() => {}} aria-label="Tags" disabled />
    </div>
  ),
};
