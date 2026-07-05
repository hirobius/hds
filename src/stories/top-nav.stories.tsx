/**
 * TopNav stories.
 * @see src/app/components/top-nav.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { TopNav } from '../app/components/top-nav';
import { Button } from '../app/components/button';

const meta = {
  title: 'Patterns/top-nav',
  component: TopNav,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TopNav>;

export default meta;
type Story = StoryObj<typeof meta>;

const linkClass = 'px-3 h-8 flex items-center text-sm font-medium text-foreground';

export const Default: Story = {
  render: () => (
    <TopNav
      brand={<span className="font-medium text-foreground">Hirobius</span>}
      trailing={<Button size="sm">Sign in</Button>}
    >
      <a className={linkClass} href="#overview">
        Overview
      </a>
      <a className={linkClass} href="#docs">
        Docs
      </a>
      <a className={linkClass} href="#pricing">
        Pricing
      </a>
    </TopNav>
  ),
};

export const Sticky: Story = {
  render: () => (
    <TopNav
      sticky
      brand={<span className="font-medium text-foreground">Hirobius</span>}
      trailing={<Button size="sm">Sign in</Button>}
    >
      <a className={linkClass} href="#overview">
        Overview
      </a>
      <a className={linkClass} href="#docs">
        Docs
      </a>
    </TopNav>
  ),
};
