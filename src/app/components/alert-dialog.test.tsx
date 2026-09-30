/**
 * Tests for AlertDialog. Plain-DOM assertions. Radix AlertDialog needs the
 * same jsdom polyfills as Dialog (pointer capture, scrollIntoView).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { AlertDialog } from './alert-dialog';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

function Example() {
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

describe('AlertDialog', () => {
  it('renders no alertdialog while closed', () => {
    render(<Example />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('opens from the trigger with title + actions', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('alertdialog')).not.toBeNull();
    expect(screen.getByText('Delete project?')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeNull();
  });

  it('renders open when controlled', () => {
    render(
      <AlertDialog open>
        <AlertDialog.Content>
          <AlertDialog.Title>Title</AlertDialog.Title>
        </AlertDialog.Content>
      </AlertDialog>,
    );
    expect(screen.getByRole('alertdialog')).not.toBeNull();
  });
});

describe('AlertDialog compound assembly (hds#363)', () => {
  it('does not write the parts onto the Radix Root export', () => {
    expect(AlertDialog).not.toBe(AlertDialogPrimitive.Root);
    const root = AlertDialogPrimitive.Root as unknown as Record<string, unknown>;
    for (const part of [
      'Trigger',
      'Portal',
      'Overlay',
      'Content',
      'Header',
      'Footer',
      'Title',
      'Description',
      'Action',
      'Cancel',
    ]) {
      expect(root[part], `Radix Root.${part}`).toBeUndefined();
    }
  });

  it('keeps every static part and the display name', () => {
    expect(AlertDialog.displayName).toBe('AlertDialog');
    for (const part of [
      'Trigger',
      'Portal',
      'Overlay',
      'Content',
      'Header',
      'Footer',
      'Title',
      'Description',
      'Action',
      'Cancel',
    ] as const) {
      expect(AlertDialog[part], part).toBeDefined();
    }
    expect(AlertDialog.Trigger).toBe(AlertDialogPrimitive.Trigger);
    expect(AlertDialog.Action).toBe(AlertDialogPrimitive.Action);
    expect(AlertDialog.Cancel).toBe(AlertDialogPrimitive.Cancel);
  });

  it('still forwards root props to Radix (uncontrolled defaultOpen)', () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialog.Content>
          <AlertDialog.Title>Default open</AlertDialog.Title>
        </AlertDialog.Content>
      </AlertDialog>,
    );
    expect(screen.getByRole('alertdialog', { name: 'Default open' })).toBeTruthy();
  });
});
