/**
 * InfoPage stories — branded profile surface demos.
 * @see src/app/components/info-page.tsx
 *
 * Caveat: InfoPage renders a hard-coded portfolio profile (Adrian Milsap) with a
 * fixed image at /assets/adrian.webp. In Storybook's static preview the image
 * will 404 unless the asset is served; this is expected and does not affect
 * component mounting. The expand/collapse photo interaction requires a real DOM
 * (works in the browser, not in jsdom).
 */
import type { Meta, StoryObj } from '@storybook/react';
import { InfoPage } from '../app/components/info-page';

const meta = {
  title: 'Branding/info-page',
  component: InfoPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Branded profile surface used for the portfolio landing page. Renders a two-column layout with an expandable profile photo and bio. isDark is a route-wrapper flag; tokenized CSS drives the actual theme swap.',
      },
    },
  },
  argTypes: {
    isDark: { control: 'boolean' },
  },
} satisfies Meta<typeof InfoPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isDark: false,
  },
};

export const Dark: Story = {
  args: {
    isDark: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'isDark flag passed — tokenized CSS swap drives the visual theme; flag itself is for route-wrapper parity.',
      },
    },
  },
};
