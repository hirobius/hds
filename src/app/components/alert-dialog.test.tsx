/**
 * Tests for AlertDialog. Plain-DOM assertions. Radix AlertDialog needs the
 * same jsdom polyfills as Dialog (pointer capture, scrollIntoView).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
