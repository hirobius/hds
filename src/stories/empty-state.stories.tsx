/**
 * EmptyState stories — title, description, and layout demos.
 * @see src/app/components/empty-state.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from '../app/components/empty-state';

const meta = {
  title: 'Primitives/empty-state',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Inline empty-state placeholder for lists, grids, and sections. Provides consistent muted typography for "no data yet" scenarios. Not for full-page errors or loading states.',
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No components yet',
    description: 'Add your first component to get started.',
  },
};

export const TitleOnly: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Minimal variant — only a primary message, no supporting line.',
      },
    },
  },
  args: {
    title: 'No activity to display',
  },
};

export const WithDescription: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Primary message with a supplementary description.',
      },
    },
  },
  args: {
    title: 'No tokens found',
    description: 'Try adjusting your search query or switching to a different category.',
  },
};

export const InGrid: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Empty state inside a simple grid container, showing how it fills the available space.',
      },
    },
  },
  render: () => (
    <div
      style={{
        border: '1px dashed var(--semantic-color-border-default, #ccc)',
        borderRadius: '4px',
        padding: '32px',
        minWidth: '320px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EmptyState
        title="No results match your filters"
        description="Clear one or more filters to see more components."
      />
    </div>
  ),
};
