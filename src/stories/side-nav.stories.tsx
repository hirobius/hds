/**
 * SideNav stories — sidebar navigation row primitive.
 * @see src/app/components/side-nav.tsx
 *
 * Utility-tier row used inside the docs sidebar shell. Two levels (root /
 * nested) with idle → hover/active text and an accent-subtle active fill.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { SideNav } from '../app/components/side-nav';

const meta = {
  title: 'Navigation/side-nav',
  component: SideNav,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Sidebar navigation row. Root rows match the group-header altitude; nested rows are indented page links. Idle text is content-secondary, promoting to primary on hover and accent on active.',
      },
    },
  },
  argTypes: {
    level: { control: { type: 'inline-radio' }, options: ['root', 'nested'] },
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
    titleLabel: { control: 'boolean' },
  },
} satisfies Meta<typeof SideNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Root: Story = {
  args: { label: 'Foundations', href: '#', level: 'root' },
};

export const NestedActive: Story = {
  args: { label: 'Color', href: '#', level: 'nested', active: true },
};

export const Disabled: Story = {
  args: { label: 'Coming soon', href: '#', level: 'nested', disabled: true },
};

export const SidebarGroup: Story = {
  parameters: {
    docs: { description: { story: 'A title label with root + nested rows, as composed inside the sidebar shell.' } },
  },
  render: () => (
    <nav style={{ display: 'flex', flexDirection: 'column', width: 240 }}>
      <SideNav label="Foundations" titleLabel level="root" />
      <SideNav label="Tokens" href="#" level="nested" />
      <SideNav label="Color" href="#" level="nested" active />
      <SideNav label="Spacing" href="#" level="nested" />
      <SideNav label="Motion (soon)" href="#" level="nested" disabled />
    </nav>
  ),
};
