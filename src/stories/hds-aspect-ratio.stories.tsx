/**
 * HdsAspectRatio stories.
 * @see src/app/components/hds-aspect-ratio.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsAspectRatio } from '../app/components/hds-aspect-ratio';

const meta = {
  title: 'Primitives/hds-aspect-ratio',
  component: HdsAspectRatio,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HdsAspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Widescreen: Story = {
  render: () => (
    <div style={{ width: '320px' }}>
      <HdsAspectRatio ratio={16 / 9}>
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
          16 : 9
        </div>
      </HdsAspectRatio>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div style={{ width: '200px' }}>
      <HdsAspectRatio ratio={1}>
        <div className="flex h-full w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
          1 : 1
        </div>
      </HdsAspectRatio>
    </div>
  ),
};
