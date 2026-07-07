/**
 * AppShell stories.
 * @see src/app/components/app-shell.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from '../app/components/app-shell';
import hds from '../app/design-system/tokens';

const meta = {
  title: 'Patterns/app-shell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    sidebarWidth: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const Header = (
  <div style={{ display: 'flex', alignItems: 'center', height: '56px', padding: '0 16px' }}>
    <span style={{ ...hds.typeStyles.ui }}>Hirobius</span>
  </div>
);

const Sidebar = (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px' }}>
    <span>Overview</span>
    <span>Projects</span>
    <span>Settings</span>
  </div>
);

const Main = (
  <div style={{ padding: '24px' }}>
    <p>Main content area.</p>
    <p>Renders inside a native &lt;main&gt; landmark.</p>
  </div>
);

export const Default: Story = {
  args: {
    header: Header,
    sidebar: Sidebar,
    children: Main,
  },
};

export const NoSidebar: Story = {
  args: {
    header: Header,
    children: Main,
  },
};

export const WideSidebar: Story = {
  args: {
    header: Header,
    sidebar: Sidebar,
    sidebarWidth: 'lg',
    children: Main,
  },
};
