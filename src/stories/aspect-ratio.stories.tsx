/**
 * AspectRatio stories.
 * @see src/app/components/aspect-ratio.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { AspectRatio } from '../app/components/aspect-ratio';

const meta = {
  title: 'Primitives/aspect-ratio',
  component: AspectRatio,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Widescreen: Story = {
  render: () => (
    <div style={{ width: '320px' }}>
      <AspectRatio ratio={16 / 9}>
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
          16 : 9
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div style={{ width: '200px' }}>
      <AspectRatio ratio={1}>
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
          1 : 1
        </div>
      </AspectRatio>
    </div>
  ),
};
