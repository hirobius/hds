/**
 * HdsContextMenu stories. Renders closed on mount (jsdom smoke-safe).
 * @see src/app/components/hds-context-menu.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsContextMenu } from '../app/components/hds-context-menu';

const meta = {
  title: 'Primitives/hds-context-menu',
  component: HdsContextMenu,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HdsContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HdsContextMenu>
      <HdsContextMenu.Trigger asChild>
        <div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          Right-click here
        </div>
      </HdsContextMenu.Trigger>
      <HdsContextMenu.Content>
        <HdsContextMenu.Label>Actions</HdsContextMenu.Label>
        <HdsContextMenu.Item>Cut</HdsContextMenu.Item>
        <HdsContextMenu.Item>Copy</HdsContextMenu.Item>
        <HdsContextMenu.Separator />
        <HdsContextMenu.Item disabled>Paste</HdsContextMenu.Item>
      </HdsContextMenu.Content>
    </HdsContextMenu>
  ),
};
