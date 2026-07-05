/**
 * Carousel stories.
 * @see src/app/components/carousel.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Carousel } from '../app/components/carousel';

const meta = {
  title: 'Patterns/carousel',
  component: Carousel,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const SLIDES = ['One', 'Two', 'Three', 'Four', 'Five'];

function SlideTile({ label }: { label: string }) {
  return (
    <div className="flex h-40 w-64 items-center justify-center rounded-md bg-muted text-foreground">
      {label}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <Carousel ariaLabel="Photos">
      {SLIDES.map((label) => (
        <SlideTile key={label} label={label} />
      ))}
    </Carousel>
  ),
};

export const NoControls: Story = {
  render: () => (
    <Carousel ariaLabel="Photos" showControls={false}>
      {SLIDES.map((label) => (
        <SlideTile key={label} label={label} />
      ))}
    </Carousel>
  ),
};
