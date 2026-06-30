/**
 * AssetImg stories — responsive asset frame with placeholder and lightbox contexts.
 * @see src/app/components/asset-img.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { AssetImg } from '../app/components/asset-img';

const meta = {
  title: 'Primitives/asset-img',
  component: AssetImg,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Responsive asset frame with onError placeholder fallback. Supports default, lightbox, and detail contexts with optional expandable tooltip.',
      },
    },
  },
  argTypes: {
    context: {
      control: { type: 'select' },
      options: ['default', 'lightbox', 'detail'],
    },
    loading: {
      control: { type: 'radio' },
      options: ['lazy', 'eager'],
    },
    expandable: { control: 'boolean' },
    isDark: { control: 'boolean' },
    draggable: { control: 'boolean' },
  },
} satisfies Meta<typeof AssetImg>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: '/assets/hero-01.webp',
    alt: 'Hero portfolio image',
    context: 'default',
    loading: 'eager',
    style: { width: 320, height: 'auto', display: 'block', borderRadius: 8 },
  },
};

export const WithTitle: Story = {
  args: {
    src: '/assets/hero-01.webp',
    alt: 'Component showcase screenshot',
    title: 'HDS Component Showcase',
    context: 'default',
    loading: 'eager',
    style: { width: 320, height: 'auto', display: 'block', borderRadius: 8 },
  },
};

export const PlaceholderFallback: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'When src resolves to a missing file the component renders a placeholder surface sized from naturalWidth/naturalHeight.',
      },
    },
  },
  args: {
    src: '/assets/_nonexistent/placeholder.png',
    alt: 'Missing asset — placeholder shown',
    naturalWidth: 16,
    naturalHeight: 9,
    context: 'default',
  },
};

export const LightboxContext: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Lightbox context renders at full available width with aspect-ratio clamping.',
      },
    },
    layout: 'padded',
  },
  args: {
    src: '/assets/hero-01.webp',
    alt: 'Lightbox asset',
    context: 'lightbox',
    loading: 'eager',
    style: { width: '100%' },
  },
};

export const DetailContext: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Detail context fills the parent container and uses the overlay surface color.',
      },
    },
  },
  args: {
    src: '/assets/_nonexistent/placeholder.png',
    alt: 'Detail view asset',
    context: 'detail',
    style: { width: 320, height: 200 },
  },
};
