/**
 * Tests for HdsAlertDialog. Plain-DOM assertions. Radix AlertDialog needs the
 * same jsdom polyfills as Dialog (pointer capture, scrollIntoView).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HdsAlertDialog } from './hds-alert-dialog';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

function Example() {
  return (
    <HdsAlertDialog>
      <HdsAlertDialog.Trigger>Delete</HdsAlertDialog.Trigger>
      <HdsAlertDialog.Content>
        <HdsAlertDialog.Header>
          <HdsAlertDialog.Title>Delete project?</HdsAlertDialog.Title>
          <HdsAlertDialog.Description>This cannot be undone.</HdsAlertDialog.Description>
        </HdsAlertDialog.Header>
        <HdsAlertDialog.Footer>
          <HdsAlertDialog.Cancel>Cancel</HdsAlertDialog.Cancel>
          <HdsAlertDialog.Action>Confirm</HdsAlertDialog.Action>
        </HdsAlertDialog.Footer>
      </HdsAlertDialog.Content>
    </HdsAlertDialog>
  );
}

describe('HdsAlertDialog', () => {
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
      <HdsAlertDialog open>
        <HdsAlertDialog.Content>
          <HdsAlertDialog.Title>Title</HdsAlertDialog.Title>
        </HdsAlertDialog.Content>
      </HdsAlertDialog>,
    );
    expect(screen.getByRole('alertdialog')).not.toBeNull();
  });
});
