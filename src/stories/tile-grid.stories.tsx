/**
 * TileGrid stories — gap, minTileWidth, and responsive layout demos.
 * @see src/app/components/tile-grid.tsx
 */
import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TileGrid } from '../app/components/tile-grid';

const meta = {
  title: 'Primitives/tile-grid',
  component: TileGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Auto-fill responsive grid for status tiles and micro-cards. Wraps children in a single CSS grid declaration so pages avoid repeating the auto-fill minmax recipe.',
      },
    },
  },
  argTypes: {
    gap: {
      control: { type: 'radio' },
      options: ['xs', 'sm', 'md'],
    },
  },
} satisfies Meta<typeof TileGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

function SampleTile({ label, color }: { label: string; color: string }) {
  // Story-only demo tile — object built here (not a dense inline style={{ }})
  // so check-style-discipline stays clean; `color` is the per-tile prop.
  const tileStyle: CSSProperties = {
    background: color,
    borderRadius: '6px',
    padding: '20px 16px',
    fontSize: '13px',
    fontFamily: 'var(--font-mono, monospace)',
    color: 'var(--semantic-color-content-primary, #111)',
    minHeight: '72px',
    display: 'flex',
    alignItems: 'center',
  };
  return <div style={tileStyle}>{label}</div>;
}

const tileColors = [
  'var(--semantic-color-surface-raised, #f5f5f5)',
  'var(--semantic-color-surface-raised, #f5f5f5)',
  'var(--semantic-color-surface-raised, #f5f5f5)',
  'var(--semantic-color-surface-raised, #f5f5f5)',
  'var(--semantic-color-surface-raised, #f5f5f5)',
  'var(--semantic-color-surface-raised, #f5f5f5)',
];

export const Default: Story = {
  args: {
    gap: 'sm',
    minTileWidth: '260px',
  },
  render: (args) => (
    <TileGrid {...args}>
      {tileColors.map((color, i) => (
        <SampleTile key={i} label={`Tile ${i + 1}`} color={color} />
      ))}
    </TileGrid>
  ),
};

export const GapXs: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Tightest gap (8 px) for dense micro-tile layouts.',
      },
    },
  },
  render: () => (
    <TileGrid gap="xs">
      {tileColors.map((color, i) => (
        <SampleTile key={i} label={`xs · ${i + 1}`} color={color} />
      ))}
    </TileGrid>
  ),
};

export const GapMd: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Medium gap (16 px) for card-style layouts with more breathing room.',
      },
    },
  },
  render: () => (
    <TileGrid gap="md">
      {tileColors.map((color, i) => (
        <SampleTile key={i} label={`md · ${i + 1}`} color={color} />
      ))}
    </TileGrid>
  ),
};

export const NarrowTiles: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Narrow minTileWidth forces more columns at wider viewports.',
      },
    },
  },
  render: () => (
    <TileGrid minTileWidth="160px" gap="sm">
      {Array.from({ length: 8 }, (_, i) => (
        <SampleTile key={i} label={`160 · ${i + 1}`} color={tileColors[i % tileColors.length]} />
      ))}
    </TileGrid>
  ),
};

export const WideTiles: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Wider minTileWidth reduces to fewer columns, suitable for richer status cards.',
      },
    },
  },
  render: () => (
    <TileGrid minTileWidth="360px" gap="md">
      {tileColors.slice(0, 4).map((color, i) => (
        <SampleTile key={i} label={`360 · ${i + 1}`} color={color} />
      ))}
    </TileGrid>
  ),
};
