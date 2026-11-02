'use client';

import {
  AlertDialog,
  Button,
  CommandPalette,
  Dialog,
  Menu,
  Popover,
  Sheet,
  Stack,
  Text,
  Tooltip,
  useToast,
} from '@hirobius/design-system';
import { useState } from 'react';

/** Everything that opens on top of the page: a menu, a popover, a tooltip, a dialog, an alert dialog, a sheet and a command palette. */
export function TourOverlays() {
  const { toast } = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);
  return (
    <Stack direction="row" gap="normal" wrap="wrap">
      <Menu>
        <Menu.Trigger asChild>
          <Button variant="secondary">Actions</Button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Label>Console</Menu.Label>
          <Menu.Item onSelect={() => toast({ title: 'Exported', tone: 'success' })}>
            Export tokens
          </Menu.Item>
          <Menu.Item onSelect={() => toast({ title: 'Copied link', tone: 'info' })}>
            Copy link
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item disabled onSelect={() => {}}>
            Delete
          </Menu.Item>
        </Menu.Content>
      </Menu>
      <Popover>
        <Popover.Trigger asChild>
          <Button variant="secondary">About</Button>
        </Popover.Trigger>
        <Popover.Content>
          <Text variant="ui">This console is built from the design system's own data.</Text>
        </Popover.Content>
      </Popover>
      <Tooltip>
        <Tooltip.Trigger asChild>
          <Button variant="secondary">Hover or focus me</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Saved to your library</Tooltip.Content>
      </Tooltip>
      <Dialog>
        <Dialog.Trigger asChild>
          <Button variant="primary">Open dialog</Button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Publish release notes</Dialog.Title>
            <Dialog.Description>
              This publishes the latest notes to the changelog page.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button variant="primary">Publish</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
      <AlertDialog>
        <AlertDialog.Trigger asChild>
          <Button variant="secondary" tone="danger">
            Delete console
          </Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Delete the console?</AlertDialog.Title>
            <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="primary" tone="danger">
                Delete
              </Button>
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
      <Sheet>
        <Sheet.Trigger asChild>
          <Button variant="secondary">Sort</Button>
        </Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Sort consoles</Sheet.Title>
            <Sheet.Description>A bottom sheet on a phone.</Sheet.Description>
          </Sheet.Header>
          <Sheet.Actions aria-label="Sort order">
            <Sheet.Action current>Newest</Sheet.Action>
            <Sheet.Action>Name</Sheet.Action>
          </Sheet.Actions>
          <Sheet.Footer>
            <Sheet.Close asChild>
              <Button variant="secondary">Done</Button>
            </Sheet.Close>
          </Sheet.Footer>
        </Sheet.Content>
      </Sheet>
      <Button variant="secondary" onClick={() => setPaletteOpen(true)}>
        Search commands
      </Button>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        hotkey={false}
        items={[
          { id: 'export', label: 'Export tokens', group: 'Console' },
          { id: 'copy', label: 'Copy link', group: 'Console' },
          { id: 'releases', label: 'Go to releases', group: 'Navigation', shortcut: ['G', 'R'] },
        ]}
        onSelect={(item) => toast({ title: item.label, tone: 'info' })}
      />
    </Stack>
  );
}
