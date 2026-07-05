/**
 * Lightbox stories. Interactive open via a trigger (closed on mount).
 * @see src/app/components/image-lightbox.tsx
 */
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Lightbox } from '../app/components/image-lightbox';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/image-lightbox',
  component: Lightbox,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Lightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

function LightboxDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open lightbox</Button>
      <Lightbox
        open={open}
        onClose={() => setOpen(false)}
        src="/assets/example.webp"
        alt="Example case-study image"
        caption="Example caption"
      />
    </>
  );
}

export const Default: Story = {
  render: () => <LightboxDemo />,
};
