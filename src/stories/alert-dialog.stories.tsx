/**
 * AlertDialog stories. Renders closed on mount (jsdom smoke-safe).
 * @see src/app/components/alert-dialog.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { AlertDialog } from '../app/components/alert-dialog';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/alert-dialog',
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
