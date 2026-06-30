/**
 * InlineLink stories — internal and external inline link demos.
 * @see src/app/components/inline-link.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { InlineLink } from '../app/components/inline-link';

const meta = {
  title: 'Primitives/inline-link',
  component: InlineLink,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Inline body-text link. Internal hrefs (starting with "/") render as client-side navigation; external hrefs open in a new tab with an optional external-link icon.',
      },
    },
  },
  argTypes: {
    externalIcon: { control: 'boolean' },
  },
} satisfies Meta<typeof InlineLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    href: 'https://hirobius.com',
    children: 'Hirobius.com',
    externalIcon: true,
  },
};

export const InternalRoute: Story = {
  args: {
    href: '/components',
    children: 'component library',
    externalIcon: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Internal href — routes through the HDS router adapter (client-side nav).',
      },
    },
  },
};

export const ExternalNoIcon: Story = {
  args: {
    href: 'https://storybook.js.org',
    children: 'Storybook documentation',
    externalIcon: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'External link with the trailing icon suppressed.',
      },
    },
  },
};

export const InBodyCopy: Story = {
  parameters: {
    docs: {
      description: {
        story: 'InlineLink embedded in a paragraph of body copy — the most common usage pattern.',
      },
    },
  },
  render: () => (
    <p style={{ maxWidth: '480px', lineHeight: 1.6 }}>
      The Hirobius Design System ships a token-driven{' '}
      <InlineLink href="/components">component library</InlineLink> and a Figma
      bridge. Read the{' '}
      <InlineLink href="https://hirobius.com/docs">public documentation</InlineLink>{' '}
      for full integration details.
    </p>
  ),
};
