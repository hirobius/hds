/**
 * Tests for Dialog — closed/open mounting, trigger open, controlled open, title.
 * Plain-DOM assertions (no jest-dom). Radix Dialog needs a couple of jsdom
 * polyfills (pointer capture, scrollIntoView).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Dialog } from './dialog';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

function Example() {
  return (
    <Dialog>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Confirm</Dialog.Title>
        <Dialog.Description>Are you sure?</Dialog.Description>
      </Dialog.Content>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('renders no dialog while closed', () => {
    render(<Example />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the dialog from the trigger with an accessible name', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(screen.getByText('Confirm')).not.toBeNull();
  });

  it('renders open when controlled', () => {
    render(
      <Dialog open>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
        </Dialog.Content>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).not.toBeNull();
  });
});
