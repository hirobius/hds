/**
 * AlertDialog stories. Renders closed on mount (jsdom smoke-safe).
 * @see src/app/components/alert-dialog.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { AlertDialog } from '../app/components/alert-dialog';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/Alert Dialog',
  component: AlertDialog,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialog.Trigger asChild>
        <Button tone="danger">Delete project</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Delete project?</AlertDialog.Title>
          <AlertDialog.Description>
            This permanently removes the project and all of its data. This action cannot be undone.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel asChild>
            <Button variant="secondary">Cancel</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action asChild>
            <Button tone="danger">Delete</Button>
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  ),
};

export const DarkScope: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Overlays inherit the nearest `data-hds` scope. Only the wrapper is `data-theme="dark"`; the alert dialog and its scrim render dark.',
      },
    },
  },
  render: () => (
    <div
      data-hds
      data-theme="dark"
      style={{
        padding: 'var(--semantic-space-scale-xl)',
        background: 'var(--semantic-color-surface-page)',
        color: 'var(--semantic-color-content-primary)',
      }}
    >
      <AlertDialog>
        <AlertDialog.Trigger asChild>
          <Button tone="danger">Delete project</Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Delete project?</AlertDialog.Title>
            <AlertDialog.Description>
              This permanently removes the project and all of its data.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button tone="danger">Delete</Button>
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </div>
  ),
  // Open on load for visual review (plain DOM click; jsdom gates never run `play`).
  play: async ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button')?.click();
  },
};
