/**
 * Tag stories — active state and click handler demos.
 * @see src/app/components/Tag.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Tag } from '../app/components/tag';

const meta = {
  title: 'Primitives/tag',
  component: Tag,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Interactive filter and category chip. Outer button carries the 44px accessible hit target; inner pill keeps the visible surface compact. Active state uses brand fill via [data-active].',
      },
    },
  },
  argTypes: {
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Design Systems' },
};

export const Active: Story = {
  args: { children: 'Design Systems', active: true },
};

export const Disabled: Story = {
  args: { children: 'Unavailable', disabled: true },
};

export const StateMatrix: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Rest, hover (:hover on the pill via group-hover), active/selected, focus-visible (tab to a tag), and disabled — the full interaction matrix.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Tag>Rest</Tag>
      <Tag active>Selected</Tag>
      <Tag disabled>Disabled</Tag>
      <Tag disabled active>
        Selected + disabled
      </Tag>
    </div>
  ),
};

const TAG_CATEGORIES = ['Design Systems', 'React', 'Tokens', 'A11y', 'Figma'];

function InteractiveRender() {
  const [active, setActive] = useState<string[]>([]);

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {TAG_CATEGORIES.map((cat) => (
        <Tag
          key={cat}
          active={active.includes(cat)}
          onClick={() =>
            setActive((prev) =>
              prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
            )
          }
        >
          {cat}
        </Tag>
      ))}
    </div>
  );
}

export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Controlled toggle group — click to select/deselect.',
      },
    },
  },
  render: () => <InteractiveRender />,
};

export const FilterRow: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Static row of tags showing both active and inactive states.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Tag active>Selected</Tag>
      <Tag>Option B</Tag>
      <Tag>Option C</Tag>
      <Tag active>Also Selected</Tag>
    </div>
  ),
};
