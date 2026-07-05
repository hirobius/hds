/**
 * HdsAlertDialog stories. Renders closed on mount (jsdom smoke-safe).
 * @see src/app/components/hds-alert-dialog.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { HdsAlertDialog } from '../app/components/hds-alert-dialog';
import { Button } from '../app/components/button';

const meta = {
  title: 'Primitives/hds-alert-dialog',
  component: HdsAlertDialog,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HdsAlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HdsAlertDialog>
      <HdsAlertDialog.Trigger asChild>
        <Button tone="danger">Delete project</Button>
      </HdsAlertDialog.Trigger>
      <HdsAlertDialog.Content>
        <HdsAlertDialog.Header>
          <HdsAlertDialog.Title>Delete project?</HdsAlertDialog.Title>
          <HdsAlertDialog.Description>
            This permanently removes the project and all of its data. This action cannot be undone.
          </HdsAlertDialog.Description>
        </HdsAlertDialog.Header>
        <HdsAlertDialog.Footer>
          <HdsAlertDialog.Cancel asChild>
            <Button variant="secondary">Cancel</Button>
          </HdsAlertDialog.Cancel>
          <HdsAlertDialog.Action asChild>
            <Button tone="danger">Delete</Button>
          </HdsAlertDialog.Action>
        </HdsAlertDialog.Footer>
      </HdsAlertDialog.Content>
    </HdsAlertDialog>
  ),
};
