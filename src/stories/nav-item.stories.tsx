/**
 * NavItem stories — navigation row primitive variants and states.
 * @see src/app/components/nav-item.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { NavItem } from '../app/components/nav-item';

const meta = {
  title: 'Primitives/nav-item',
  component: NavItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Navigation row primitive for sidebars and table-of-contents panels. Variants: side | toc. Levels: root | section | nested | deep.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['side', 'toc'],
    },
    level: {
      control: { type: 'select' },
      options: ['root', 'section', 'nested', 'deep'],
    },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Components',
    href: '/components',
    variant: 'side',
    level: 'root',
  },
};

export const Active: Story = {
  args: {
    label: 'Design Tokens',
    href: '/tokens',
    variant: 'side',
    level: 'root',
    active: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Active state — accent background and text, accent indicator strip.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    label: 'Coming Soon',
    href: '/roadmap',
    variant: 'side',
    level: 'root',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state — muted text, no pointer events.',
      },
    },
  },
};

export const TocVariant: Story = {
  args: {
    label: 'Installation',
    href: '/docs/installation',
    variant: 'toc',
    level: 'root',
  },
  parameters: {
    docs: {
      description: {
        story: 'Table-of-contents variant with a left indicator strip.',
      },
    },
  },
};

export const TocActive: Story = {
  args: {
    label: 'Typography',
    href: '/docs/typography',
    variant: 'toc',
    level: 'root',
    active: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Active TOC item — accent indicator strip is highlighted.',
      },
    },
  },
};

export const NestedLevel: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Side nav items at root, section, nested, and deep hierarchy levels.',
      },
    },
  },
  render: () => (
    <div style={{ width: '240px' }}>
      <NavItem label="Design System" href="/design-system" variant="side" level="root" />
      <NavItem label="Foundations" href="/design-system/foundations" variant="side" level="section" />
      <NavItem label="Color" href="/design-system/foundations/color" variant="side" level="nested" />
      <NavItem label="Color Tokens" href="/design-system/foundations/color/tokens" variant="side" level="deep" />
    </div>
  ),
};

export const ButtonMode: Story = {
  args: {
    label: 'Trigger action',
    variant: 'side',
    level: 'root',
  },
  parameters: {
    docs: {
      description: {
        story: 'When no href is provided, NavItem renders as a <button> for callback-only nav patterns.',
      },
    },
  },
};
