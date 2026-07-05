/**
 * CommandPalette stories. Renders the trigger; the dialog opens on click or
 * Cmd-K / Ctrl-K (closed on mount, so jsdom smoke-safe).
 * @see src/app/components/command-palette.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CommandPalette } from '../app/components/command-palette';

const meta = {
  title: 'Primitives/command-palette',
  component: CommandPalette,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '320px' }}>
      <CommandPalette />
    </div>
  ),
};
