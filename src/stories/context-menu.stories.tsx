/**
 * ContextMenu stories. Renders closed on mount (jsdom smoke-safe).
 * @see src/app/components/context-menu.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { ContextMenu } from '../app/components/context-menu';

const meta = {
  title: 'Primitives/context-menu',
  component: ContextMenu,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          Right-click here
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>Actions</ContextMenu.Label>
        <ContextMenu.Item>Cut</ContextMenu.Item>
        <ContextMenu.Item>Copy</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item disabled>Paste</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  ),
};
