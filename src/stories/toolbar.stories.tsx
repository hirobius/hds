/**
 * Toolbar stories.
 * @see src/app/components/toolbar.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Bold, Italic, Underline } from 'lucide-react';
import { Toolbar } from '../app/components/toolbar';

const meta = {
  title: 'Patterns/toolbar',
  component: Toolbar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Toolbar aria-label="Formatting">
      <Toolbar.ToggleGroup type="single" defaultValue="bold" aria-label="Text style">
        <Toolbar.ToggleItem value="bold" aria-label="Bold">
          <Bold size={14} />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem value="italic" aria-label="Italic">
          <Italic size={14} />
        </Toolbar.ToggleItem>
        <Toolbar.ToggleItem value="underline" aria-label="Underline">
          <Underline size={14} />
        </Toolbar.ToggleItem>
      </Toolbar.ToggleGroup>
      <Toolbar.Separator />
      <Toolbar.Button>Copy</Toolbar.Button>
      <Toolbar.Button>Share</Toolbar.Button>
    </Toolbar>
  ),
};
