/**
 * NavGroup stories — labeled navigation group pattern demos.
 * @see src/app/components/nav-group.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { NavGroup } from '../app/components/nav-group';

const COMPONENTS_ITEMS = [
  { path: '/components/badge', label: 'Badge' },
  { path: '/components/button', label: 'Button' },
  { path: '/components/icon-button', label: 'Icon Button' },
  { path: '/components/nav-item', label: 'Nav Item' },
];

const FOUNDATIONS_ITEMS = [
  { path: '/foundations/color', label: 'Color' },
  { path: '/foundations/typography', label: 'Typography' },
  { path: '/foundations/spacing', label: 'Spacing' },
];

const meta = {
  title: 'Primitives/nav-group',
  component: NavGroup,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Labeled navigation group composing NavItem rows. Variants: side | toc. Supports optional collapsible disclosure wrapper.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['side', 'toc'],
    },
    collapsible: { control: 'boolean' },
  },
} satisfies Meta<typeof NavGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Components',
    variant: 'side',
    items: COMPONENTS_ITEMS,
  },
};

export const NoLabel: Story = {
  args: {
    variant: 'side',
    items: FOUNDATIONS_ITEMS,
  },
  parameters: {
    docs: {
      description: {
        story: 'NavGroup without a section label — items render directly in a nav element.',
      },
    },
  },
};

export const TocVariant: Story = {
  args: {
    label: 'On this page',
    variant: 'toc',
    items: [
      { path: '#overview', label: 'Overview' },
      { path: '#props', label: 'Props' },
      { path: '#examples', label: 'Examples' },
      { path: '#accessibility', label: 'Accessibility' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Table-of-contents variant — smaller type, left indicator strips on items.',
      },
    },
  },
};

export const Collapsible: Story = {
  args: {
    label: 'Components',
    variant: 'side',
    collapsible: true,
    items: COMPONENTS_ITEMS,
  },
  parameters: {
    docs: {
      description: {
        story: 'Collapsible group wraps items in a Disclosure. Defaults to open when an item is active.',
      },
    },
  },
};

export const WithDisabledItem: Story = {
  args: {
    label: 'Foundations',
    variant: 'side',
    items: [
      { path: '/foundations/color', label: 'Color' },
      { path: '/foundations/typography', label: 'Typography' },
      { path: '/foundations/motion', label: 'Motion', disabled: true },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Group with one disabled item — it renders muted and non-interactive.',
      },
    },
  },
};
