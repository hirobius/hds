/**
 * CinematicLink stories — editorial hover animation demos.
 * @see src/app/components/cinematic-link.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CinematicLink } from '../app/components/cinematic-link';

const meta = {
  title: 'Primitives/cinematic-link',
  component: CinematicLink,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Cinematic editorial link for portfolio hero surfaces. On hover the label slides up with an expo-out cubic-bezier and an underline sweeps in from the right.',
      },
    },
  },
} satisfies Meta<typeof CinematicLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    href: '/portfolio',
    children: 'View portfolio',
  },
};

export const ExternalHref: Story = {
  args: {
    href: 'https://hirobius.com',
    children: 'Hirobius.com',
  },
  parameters: {
    docs: {
      description: {
        story: 'Cinematic link pointing to an external URL.',
      },
    },
  },
};

export const ShortLabel: Story = {
  args: {
    href: '/work',
    children: 'Work',
  },
  parameters: {
    docs: {
      description: {
        story: 'Short single-word label — underline animation still fires across the full text width.',
      },
    },
  },
};

export const LongLabel: Story = {
  args: {
    href: '/case-studies/hirobius-design-system',
    children: 'Hirobius Design System — a case study in systematic design',
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Long label to verify the overflow-hidden clip container stays bounded.',
      },
    },
  },
};
