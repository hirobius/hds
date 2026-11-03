/**
 * Fixtures shared by the keyboard and screen-reader contract suites, so both
 * drive the same markup: a change here moves both suites at once.
 *
 * Not a test file (no `.test.` in the name), so vitest does not collect it.
 */
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '@/app/components/dialog';
import { AlertDialog } from '@/app/components/alert-dialog';
import { Menu } from '@/app/components/menu';
import { Select } from '@/app/components/select';
import { Combobox } from '@/app/components/combobox';
import type { CommandPaletteItem } from '@/app/components/command-palette';

/** A real keyboard. Radix sets pointer-events: none on some wrappers, so skip that check. */
export const user = () => userEvent.setup({ pointerEventsCheck: 0 });

export const FRUIT = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

/** A CommandPalette list whose first command takes an option step and a free-text step. */
export const MULTI_STEP_COMMANDS: CommandPaletteItem[] = [
  {
    id: 'move',
    label: 'Move issue',
    group: 'Actions',
    args: [
      {
        id: 'project',
        label: 'Project',
        options: [
          { id: 'web', label: 'Website' },
          { id: 'api', label: 'API platform', keywords: ['backend'] },
        ],
      },
      { id: 'note', label: 'Note' },
    ],
  },
  { id: 'inbox', label: 'Go to inbox', group: 'Navigation' },
];

export function DialogFixture() {
  return (
    <Dialog>
      <Dialog.Trigger>Open dialog</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.Description>Adjust things.</Dialog.Description>
        </Dialog.Header>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Dialog.Content>
    </Dialog>
  );
}

export function MenuFixture() {
  return (
    <Menu>
      <Menu.Trigger>Actions</Menu.Trigger>
      <Menu.Content>
        <Menu.Item>Apple</Menu.Item>
        <Menu.Item>Banana</Menu.Item>
        <Menu.Item>Cherry</Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

export function SelectFixture({ showLabel }: { showLabel?: boolean } = {}) {
  const [value, setValue] = useState('apple');
  return (
    <Select label="Fruit" showLabel={showLabel} options={FRUIT} value={value} onChange={setValue} />
  );
}

export function ComboboxFixture() {
  const [value, setValue] = useState<string | null>(null);
  return <Combobox aria-label="Fruit" options={FRUIT} value={value} onChange={setValue} />;
}

export function AlertDialogFixture() {
  return (
    <AlertDialog>
      <AlertDialog.Trigger>Delete</AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Delete project?</AlertDialog.Title>
          <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action>Confirm</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
