/**
 * DocLinkCard stories — navigation card for editorial and documentation cross-links.
 * @see src/app/components/doc-link-card.tsx
 *
 * Note: DocLinkCard calls useHdsRouter() which has a router-free fallback
 * (window.location.assign) and useLanguage() which has a default context value,
 * so no additional providers are needed beyond the global ThemeProvider.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { BookOpen, Layers, Palette, ArrowRight, Zap } from 'lucide-react';
import { DocLinkCard } from '../app/components/doc-link-card';

const meta = {
  title: 'Primitives/doc-link-card',
  component: DocLinkCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Navigation card for editorial and documentation cross-links. Variants: feature (default) and pager. Supports accent tint, disabled state, and directional affordances.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['feature', 'pager'],
    },
    affordance: {
      control: { type: 'select' },
      options: ['up-right', 'right', 'left'],
    },
    metaStyle: {
      control: { type: 'radio' },
      options: ['caption', 'ui'],
    },
    accent: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof DocLinkCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Design Tokens',
    description:
      'Explore the full token inventory — spacing, color, typography, motion, and radius.',
    href: '/tokens',
    icon: Palette,
    meta: 'Foundation',
    variant: 'feature',
    affordance: 'up-right',
  },
};

export const Accent: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Accent tints the card surface for visual emphasis on primary cross-links.',
      },
    },
  },
  args: {
    title: 'Component Library',
    description: 'Browse every HDS primitive — prop tables, specimens, and Figma source links.',
    href: '/components',
    icon: Layers,
    meta: 'Reference',
    accent: true,
    variant: 'feature',
    affordance: 'up-right',
  },
};

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Disabled state reduces contrast and suppresses pointer interaction.',
      },
    },
  },
  args: {
    title: 'Motion Spec',
    description: 'Coming soon — motion principles and token-driven animation guidelines.',
    href: '/motion',
    icon: Zap,
    meta: 'Planned',
    disabled: true,
    variant: 'feature',
    affordance: 'up-right',
  },
};

export const PagerForward: Story = {
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        story: 'Pager variant renders a compact directional card for prev/next doc navigation.',
      },
    },
  },
  args: {
    title: 'Getting Started',
    href: '/getting-started',
    icon: ArrowRight,
    variant: 'pager',
    affordance: 'right',
  },
};

export const PagerBack: Story = {
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        story: 'Pager variant with left affordance for "previous" navigation.',
      },
    },
  },
  args: {
    title: 'Overview',
    href: '/overview',
    icon: BookOpen,
    variant: 'pager',
    affordance: 'left',
  },
};
